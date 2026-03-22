"""
RAG observability and evaluation utilities.

Dev-only telemetry for chat retrieval + generation traces, plus lightweight
evaluation helpers for benchmark-style checks.
"""

from __future__ import annotations

import json
import math
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.agent.llm_client import get_completion, get_last_stream_meta
from backend.utils import parse_json_markdown
from logger.logger import get_logger

logger = get_logger()


@dataclass
class RetrievalMetrics:
    precision_at_k: float | None
    recall_at_k: float | None
    mrr: float | None
    ndcg_at_k: float | None
    temporal_intent_accuracy: float | None
    date_filter_coverage: float | None


def _insert_judgment(
    db: Session,
    trace_id: str,
    judge_type: str,
    groundedness: float | None,
    faithfulness: float | None,
    helpfulness: float | None,
    citation_adequacy: float | None,
    safety_tone: float | None,
    trust_answer: bool | None,
    rationale: str | None,
    pass_value: bool | int | None,
) -> None:
    db.execute(
        text(
            """
            INSERT INTO rag_judgments(
                trace_id, created_at, judge_type, groundedness, faithfulness,
                helpfulness, citation_adequacy, safety_tone, trust_answer, rationale, pass
            )
            VALUES(
                :trace_id, :created_at, :judge_type, :groundedness, :faithfulness,
                :helpfulness, :citation_adequacy, :safety_tone, :trust_answer, :rationale, :pass
            )
            """
        ),
        {
            "trace_id": trace_id,
            "created_at": _utc_now_iso(),
            "judge_type": judge_type,
            "groundedness": groundedness,
            "faithfulness": faithfulness,
            "helpfulness": helpfulness,
            "citation_adequacy": citation_adequacy,
            "safety_tone": safety_tone,
            "trust_answer": 1 if trust_answer else 0 if trust_answer is not None else None,
            "rationale": rationale,
            "pass": 1 if pass_value else 0 if pass_value is not None else None,
        },
    )


def _utc_now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds")


def create_tables(db: Session) -> None:
    """Create observability/eval tables if they do not exist."""
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS rag_runs (
                trace_id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                query TEXT NOT NULL,
                history_len INTEGER NOT NULL DEFAULT 0,
                requested_model TEXT,
                model_route TEXT,
                status TEXT NOT NULL DEFAULT 'started',
                temporal_detected INTEGER NOT NULL DEFAULT 0,
                temporal_start TEXT,
                temporal_end TEXT,
                retrieval_mode TEXT,
                requested_top_k INTEGER,
                returned_count INTEGER,
                threshold_filtered_count INTEGER,
                distance_min REAL,
                distance_p50 REAL,
                distance_p95 REAL,
                distance_max REAL,
                embed_ms REAL,
                retrieval_ms REAL,
                llm_first_token_ms REAL,
                llm_total_ms REAL,
                total_ms REAL,
                answer_text TEXT,
                error_text TEXT
            )
            """
        )
    )

    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS rag_retrieval_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trace_id TEXT NOT NULL,
                rank_index INTEGER NOT NULL,
                entry_id INTEGER NOT NULL,
                distance REAL,
                retrieval_method TEXT,
                included_in_prompt INTEGER NOT NULL DEFAULT 1,
                emotion TEXT,
                mode TEXT,
                date TEXT,
                FOREIGN KEY(trace_id) REFERENCES rag_runs(trace_id)
            )
            """
        )
    )

    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS rag_judgments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trace_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                judge_type TEXT NOT NULL,
                groundedness REAL,
                faithfulness REAL,
                helpfulness REAL,
                citation_adequacy REAL,
                safety_tone REAL,
                trust_answer INTEGER,
                rationale TEXT,
                pass INTEGER,
                FOREIGN KEY(trace_id) REFERENCES rag_runs(trace_id)
            )
            """
        )
    )

    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS rag_eval_cases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                query TEXT NOT NULL,
                case_type TEXT NOT NULL DEFAULT 'semantic',
                expected_json TEXT,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            )
            """
        )
    )

    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS rag_eval_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                eval_run_id TEXT NOT NULL,
                case_id INTEGER NOT NULL,
                trace_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                precision_at_k REAL,
                recall_at_k REAL,
                mrr REAL,
                ndcg_at_k REAL,
                temporal_intent_accuracy REAL,
                date_filter_coverage REAL,
                groundedness REAL,
                faithfulness REAL,
                helpfulness REAL,
                citation_adequacy REAL,
                safety_tone REAL,
                pass INTEGER,
                notes TEXT
            )
            """
        )
    )
    db.commit()


def seed_default_eval_cases(db: Session) -> None:
    """Insert baseline eval cases once so the bench is immediately usable."""
    existing = db.execute(text("SELECT COUNT(1) AS c FROM rag_eval_cases")).mappings().first()
    if existing and existing["c"] > 0:
        return

    now = _utc_now_iso()
    defaults = [
        (
            "Temporal last week",
            "What were my emotional patterns last week?",
            "temporal",
            {"required_temporal": True},
        ),
        (
            "Temporal this month",
            "Summarize my biggest struggles this month.",
            "temporal",
            {"required_temporal": True},
        ),
        (
            "Semantic triggers",
            "Identify my top emotional triggers.",
            "semantic",
            {"required_temporal": False},
        ),
        (
            "Goals alignment",
            "Am I aligned with my goals based on recent entries?",
            "mixed",
            {"required_temporal": False},
        ),
    ]

    for name, query, case_type, expected in defaults:
        db.execute(
            text(
                """
                INSERT INTO rag_eval_cases(name, query, case_type, expected_json, active, created_at)
                VALUES (:name, :query, :case_type, :expected_json, 1, :created_at)
                """
            ),
            {
                "name": name,
                "query": query,
                "case_type": case_type,
                "expected_json": json.dumps(expected),
                "created_at": now,
            },
        )
    db.commit()


def start_trace(
    db: Session,
    query: str,
    history_len: int,
    requested_model: str | None,
) -> str:
    trace_id = str(uuid.uuid4())
    db.execute(
        text(
            """
            INSERT INTO rag_runs(trace_id, created_at, query, history_len, requested_model, status)
            VALUES (:trace_id, :created_at, :query, :history_len, :requested_model, 'started')
            """
        ),
        {
            "trace_id": trace_id,
            "created_at": _utc_now_iso(),
            "query": query,
            "history_len": history_len,
            "requested_model": requested_model,
        },
    )
    db.commit()
    return trace_id


def save_retrieval(
    db: Session,
    trace_id: str,
    retrieval_debug: dict[str, Any],
    entries: list[dict[str, Any]],
) -> None:
    db.execute(
        text(
            """
            UPDATE rag_runs
            SET temporal_detected = :temporal_detected,
                temporal_start = :temporal_start,
                temporal_end = :temporal_end,
                retrieval_mode = :retrieval_mode,
                requested_top_k = :requested_top_k,
                returned_count = :returned_count,
                threshold_filtered_count = :threshold_filtered_count,
                distance_min = :distance_min,
                distance_p50 = :distance_p50,
                distance_p95 = :distance_p95,
                distance_max = :distance_max,
                embed_ms = :embed_ms,
                retrieval_ms = :retrieval_ms
            WHERE trace_id = :trace_id
            """
        ),
        {
            "trace_id": trace_id,
            "temporal_detected": 1 if retrieval_debug.get("temporal_detected") else 0,
            "temporal_start": retrieval_debug.get("temporal_start"),
            "temporal_end": retrieval_debug.get("temporal_end"),
            "retrieval_mode": retrieval_debug.get("retrieval_mode"),
            "requested_top_k": retrieval_debug.get("requested_top_k"),
            "returned_count": retrieval_debug.get("returned_count"),
            "threshold_filtered_count": retrieval_debug.get("threshold_filtered_count"),
            "distance_min": retrieval_debug.get("distance_min"),
            "distance_p50": retrieval_debug.get("distance_p50"),
            "distance_p95": retrieval_debug.get("distance_p95"),
            "distance_max": retrieval_debug.get("distance_max"),
            "embed_ms": retrieval_debug.get("embed_ms"),
            "retrieval_ms": retrieval_debug.get("retrieval_ms"),
        },
    )

    db.execute(text("DELETE FROM rag_retrieval_items WHERE trace_id = :trace_id"), {"trace_id": trace_id})
    for idx, entry in enumerate(entries, 1):
        db.execute(
            text(
                """
                INSERT INTO rag_retrieval_items(
                    trace_id, rank_index, entry_id, distance, retrieval_method,
                    included_in_prompt, emotion, mode, date
                )
                VALUES(
                    :trace_id, :rank_index, :entry_id, :distance, :retrieval_method,
                    1, :emotion, :mode, :date
                )
                """
            ),
            {
                "trace_id": trace_id,
                "rank_index": idx,
                "entry_id": entry.get("entry_id"),
                "distance": entry.get("distance"),
                "retrieval_method": entry.get("retrieval_method"),
                "emotion": entry.get("emotion"),
                "mode": entry.get("mode"),
                "date": entry.get("date"),
            },
        )
    db.commit()


def finalize_trace(
    db: Session,
    trace_id: str,
    answer_text: str,
    llm_first_token_ms: float | None,
    llm_total_ms: float | None,
    total_ms: float | None,
    error_text: str | None = None,
) -> None:
    stream_meta = get_last_stream_meta()
    model_route = stream_meta.get("route")
    status = "failed" if error_text else "completed"

    db.execute(
        text(
            """
            UPDATE rag_runs
            SET status = :status,
                model_route = :model_route,
                llm_first_token_ms = :llm_first_token_ms,
                llm_total_ms = :llm_total_ms,
                total_ms = :total_ms,
                answer_text = :answer_text,
                error_text = :error_text
            WHERE trace_id = :trace_id
            """
        ),
        {
            "trace_id": trace_id,
            "status": status,
            "model_route": model_route,
            "llm_first_token_ms": llm_first_token_ms,
            "llm_total_ms": llm_total_ms,
            "total_ms": total_ms,
            "answer_text": answer_text,
            "error_text": error_text,
        },
    )
    db.commit()


def record_manual_judgment(
    db: Session,
    trace_id: str,
    groundedness: float | None,
    faithfulness: float | None,
    helpfulness: float | None,
    citation_adequacy: float | None,
    safety_tone: float | None,
    trust_answer: bool | None,
    rationale: str | None,
) -> None:
    score_values = [
        x
        for x in [groundedness, faithfulness, helpfulness, citation_adequacy, safety_tone]
        if x is not None
    ]
    avg_score = (sum(score_values) / len(score_values)) if score_values else 0.0
    pass_flag = 1 if avg_score >= 3.5 and (trust_answer is not False) else 0
    _insert_judgment(
        db=db,
        trace_id=trace_id,
        judge_type="manual",
        groundedness=groundedness,
        faithfulness=faithfulness,
        helpfulness=helpfulness,
        citation_adequacy=citation_adequacy,
        safety_tone=safety_tone,
        trust_answer=trust_answer,
        rationale=rationale,
        pass_value=pass_flag,
    )
    db.commit()


def llm_judge_answer(
    query: str,
    answer: str,
    sources: list[dict[str, Any]],
    model_name: str | None = None,
) -> dict[str, Any]:
    """Advisory LLM-as-judge scoring for response quality."""
    try:
        source_block = json.dumps(sources[:8], ensure_ascii=False)
        prompt = f"""
You are evaluating a RAG assistant reply. Score each dimension 1 to 5 and return strict JSON.
Dimensions: groundedness, faithfulness, helpfulness, citation_adequacy, safety_tone.
Also return trust_answer (true/false), pass (true/false), rationale (<=40 words).

User query: {query}
Assistant answer: {answer}
Retrieved sources (JSON): {source_block}

JSON format:
{{
  "groundedness": 1,
  "faithfulness": 1,
  "helpfulness": 1,
  "citation_adequacy": 1,
  "safety_tone": 1,
  "trust_answer": false,
  "pass": false,
  "rationale": ""
}}
"""
        raw = get_completion(prompt, model_name=model_name)
        parsed = parse_json_markdown(raw)
        return {
            "groundedness": parsed.get("groundedness"),
            "faithfulness": parsed.get("faithfulness"),
            "helpfulness": parsed.get("helpfulness"),
            "citation_adequacy": parsed.get("citation_adequacy"),
            "safety_tone": parsed.get("safety_tone"),
            "trust_answer": parsed.get("trust_answer"),
            "pass": parsed.get("pass"),
            "rationale": parsed.get("rationale"),
        }
    except Exception as exc:
        logger.warning(f"LLM judge failed: {exc}")
        return {
            "groundedness": 0.0,
            "faithfulness": 0.0,
            "helpfulness": 0.0,
            "citation_adequacy": 0.0,
            "safety_tone": 0.0,
            "trust_answer": None,
            "pass": False,
            "rationale": f"judge_failed: {str(exc)[:160]}",
        }


def _dcg(binary_relevance: list[int]) -> float:
    total = 0.0
    for idx, rel in enumerate(binary_relevance, 1):
        if rel:
            total += 1.0 / math.log2(idx + 1)
    return total


def compute_retrieval_metrics(
    retrieved_entries: list[dict[str, Any]],
    expected: dict[str, Any],
    temporal_detected: bool,
) -> RetrievalMetrics:
    expected_ids = set(expected.get("expected_entry_ids", []) or [])
    required_temporal = expected.get("required_temporal")
    k = len(retrieved_entries)

    precision_at_k = 0.0
    recall_at_k = 0.0
    mrr = 0.0
    ndcg_at_k = 0.0
    date_filter_coverage = 0.0 if expected.get("date_range_start") and expected.get("date_range_end") else None

    if k > 0 and expected_ids:
        binary_rel = [1 if e.get("entry_id") in expected_ids else 0 for e in retrieved_entries]
        precision_at_k = sum(binary_rel) / k
        recall_at_k = sum(binary_rel) / len(expected_ids)

        first_rel_rank = next((idx for idx, rel in enumerate(binary_rel, 1) if rel == 1), None)
        mrr = (1.0 / first_rel_rank) if first_rel_rank else 0.0

        dcg = _dcg(binary_rel)
        ideal = [1] * min(len(expected_ids), k)
        ideal.extend([0] * max(0, k - len(ideal)))
        idcg = _dcg(ideal)
        ndcg_at_k = (dcg / idcg) if idcg > 0 else 0.0

    temporal_intent_accuracy = None
    if required_temporal is not None:
        temporal_intent_accuracy = 1.0 if bool(required_temporal) == bool(temporal_detected) else 0.0

    if expected.get("date_range_start") and expected.get("date_range_end") and k > 0:
        start = expected["date_range_start"][:10]
        end = expected["date_range_end"][:10]
        in_range = 0
        for entry in retrieved_entries:
            date_text = str(entry.get("date", ""))[:10]
            if start <= date_text <= end:
                in_range += 1
        date_filter_coverage = in_range / k

    return RetrievalMetrics(
        precision_at_k=precision_at_k,
        recall_at_k=recall_at_k,
        mrr=mrr,
        ndcg_at_k=ndcg_at_k,
        temporal_intent_accuracy=temporal_intent_accuracy,
        date_filter_coverage=date_filter_coverage,
    )


def record_llm_judgment(db: Session, trace_id: str, judgment: dict[str, Any]) -> None:
    _insert_judgment(
        db=db,
        trace_id=trace_id,
        judge_type="llm",
        groundedness=judgment.get("groundedness"),
        faithfulness=judgment.get("faithfulness"),
        helpfulness=judgment.get("helpfulness"),
        citation_adequacy=judgment.get("citation_adequacy"),
        safety_tone=judgment.get("safety_tone"),
        trust_answer=judgment.get("trust_answer"),
        rationale=judgment.get("rationale"),
        pass_value=judgment.get("pass"),
    )
    db.commit()


def list_traces(db: Session, limit: int = 50, status: str | None = None) -> list[dict[str, Any]]:
    where_sql = ""
    params: dict[str, Any] = {"limit": limit}
    if status:
        where_sql = "WHERE status = :status"
        params["status"] = status

    rows = db.execute(
        text(
            f"""
            SELECT
                trace_id, created_at, query, model_route, status, retrieval_mode,
                temporal_detected, returned_count, distance_p50, total_ms, llm_total_ms, error_text
            FROM rag_runs
            {where_sql}
            ORDER BY datetime(created_at) DESC
            LIMIT :limit
            """
        ),
        params,
    ).mappings().all()
    return [dict(row) for row in rows]


def get_trace_detail(db: Session, trace_id: str) -> dict[str, Any] | None:
    run = db.execute(
        text("SELECT * FROM rag_runs WHERE trace_id = :trace_id"),
        {"trace_id": trace_id},
    ).mappings().first()
    if not run:
        return None

    items = db.execute(
        text(
            """
            SELECT rank_index, entry_id, distance, retrieval_method, emotion, mode, date
            FROM rag_retrieval_items
            WHERE trace_id = :trace_id
            ORDER BY rank_index ASC
            """
        ),
        {"trace_id": trace_id},
    ).mappings().all()

    judgments = db.execute(
        text(
            """
            SELECT created_at, judge_type, groundedness, faithfulness, helpfulness,
                   citation_adequacy, safety_tone, trust_answer, rationale, pass
            FROM rag_judgments
            WHERE trace_id = :trace_id
            ORDER BY id DESC
            """
        ),
        {"trace_id": trace_id},
    ).mappings().all()

    return {
        "run": dict(run),
        "retrieval_items": [dict(i) for i in items],
        "judgments": [dict(j) for j in judgments],
    }


def get_eval_cases(db: Session) -> list[dict[str, Any]]:
    rows = db.execute(
        text(
            """
            SELECT id, name, query, case_type, expected_json, active, created_at
            FROM rag_eval_cases
            ORDER BY id ASC
            """
        )
    ).mappings().all()
    cases = []
    for row in rows:
        item = dict(row)
        item["expected"] = json.loads(item["expected_json"]) if item.get("expected_json") else {}
        cases.append(item)
    return cases


def add_eval_case(
    db: Session,
    name: str,
    query: str,
    case_type: str,
    expected: dict[str, Any],
    active: bool = True,
) -> None:
    db.execute(
        text(
            """
            INSERT INTO rag_eval_cases(name, query, case_type, expected_json, active, created_at)
            VALUES(:name, :query, :case_type, :expected_json, :active, :created_at)
            """
        ),
        {
            "name": name,
            "query": query,
            "case_type": case_type,
            "expected_json": json.dumps(expected),
            "active": 1 if active else 0,
            "created_at": _utc_now_iso(),
        },
    )
    db.commit()


def get_eval_summary(db: Session, window_days: int = 14) -> dict[str, Any]:
    cutoff = (datetime.utcnow() - timedelta(days=window_days)).isoformat(timespec="seconds")
    agg = db.execute(
        text(
            """
            SELECT
                COUNT(1) AS run_count,
                AVG(CASE WHEN status='completed' THEN 1.0 ELSE 0.0 END) AS success_rate,
                AVG(total_ms) AS avg_total_ms,
                AVG(llm_first_token_ms) AS avg_first_token_ms,
                AVG(llm_total_ms) AS avg_llm_ms,
                AVG(CASE WHEN model_route='ollama_fallback' THEN 1.0 ELSE 0.0 END) AS fallback_rate,
                AVG(CASE WHEN status='failed' THEN 1.0 ELSE 0.0 END) AS error_rate
            FROM rag_runs
            WHERE datetime(created_at) >= datetime(:cutoff)
            """
        ),
        {"cutoff": cutoff},
    ).mappings().first()

    eval_agg = db.execute(
        text(
            """
            SELECT
                COUNT(1) AS judged_count,
                AVG(precision_at_k) AS avg_precision_at_k,
                AVG(recall_at_k) AS avg_recall_at_k,
                AVG(mrr) AS avg_mrr,
                AVG(ndcg_at_k) AS avg_ndcg_at_k,
                AVG(temporal_intent_accuracy) AS avg_temporal_intent_accuracy,
                AVG(groundedness) AS avg_groundedness,
                AVG(faithfulness) AS avg_faithfulness,
                AVG(helpfulness) AS avg_helpfulness,
                AVG(citation_adequacy) AS avg_citation_adequacy,
                AVG(safety_tone) AS avg_safety_tone,
                AVG(CASE WHEN pass=1 THEN 1.0 ELSE 0.0 END) AS pass_rate
            FROM rag_eval_results
            WHERE datetime(created_at) >= datetime(:cutoff)
            """
        ),
        {"cutoff": cutoff},
    ).mappings().first()

    return {
        "window_days": window_days,
        "runs": dict(agg) if agg else {},
        "eval": dict(eval_agg) if eval_agg else {},
    }
