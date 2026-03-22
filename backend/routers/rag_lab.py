from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.agent.llm_client import get_completion_stream
from backend.database import get_db
from backend.schemas.rag_lab import (
    EvalCaseCreateInput,
    EvalCaseFromTraceInput,
    EvalRunInput,
    ManualJudgeInput,
)
from backend.services.chat import ChatService
from backend.services.rag_observability import (
    add_eval_case,
    compute_retrieval_metrics,
    get_eval_cases,
    get_eval_summary,
    get_trace_detail,
    list_traces,
    llm_judge_answer,
    record_manual_judgment,
    record_llm_judgment,
    save_retrieval,
    start_trace,
    finalize_trace,
)

router = APIRouter(prefix="/dev/rag", tags=["rag-lab"])


@router.get("/traces")
def traces(
    limit: int = Query(50, ge=1, le=500),
    status: str | None = Query(None, description="started|completed|failed"),
    db: Session = Depends(get_db),
):
    return list_traces(db, limit=limit, status=status)


@router.get("/traces/{trace_id}")
def trace_detail(trace_id: str, db: Session = Depends(get_db)):
    payload = get_trace_detail(db, trace_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Trace not found")
    return payload


@router.post("/judge/manual")
def judge_manual(payload: ManualJudgeInput, db: Session = Depends(get_db)):
    record_manual_judgment(
        db=db,
        trace_id=payload.trace_id,
        groundedness=payload.groundedness,
        faithfulness=payload.faithfulness,
        helpfulness=payload.helpfulness,
        citation_adequacy=payload.citation_adequacy,
        safety_tone=payload.safety_tone,
        trust_answer=payload.trust_answer,
        rationale=payload.rationale,
    )
    return {"status": "ok"}


@router.get("/eval/cases")
def eval_cases(db: Session = Depends(get_db)):
    return get_eval_cases(db)


@router.post("/eval/cases")
def create_eval_case(payload: EvalCaseCreateInput, db: Session = Depends(get_db)):
    add_eval_case(
        db=db,
        name=payload.name,
        query=payload.query,
        case_type=payload.case_type,
        expected=payload.expected,
        active=payload.active,
    )
    return {"status": "ok"}


@router.post("/eval/cases/from-trace")
def create_eval_case_from_trace(payload: EvalCaseFromTraceInput, db: Session = Depends(get_db)):
    run = db.execute(
        text(
            """
            SELECT trace_id, query, temporal_detected
            FROM rag_runs
            WHERE trace_id = :trace_id
            """
        ),
        {"trace_id": payload.trace_id},
    ).mappings().first()
    if not run:
        raise HTTPException(status_code=404, detail="Trace not found")

    rows = db.execute(
        text(
            """
            SELECT entry_id
            FROM rag_retrieval_items
            WHERE trace_id = :trace_id
            ORDER BY rank_index ASC
            LIMIT :k
            """
        ),
        {"trace_id": payload.trace_id, "k": payload.top_k_expected},
    ).mappings().all()

    expected_ids = [int(r["entry_id"]) for r in rows]
    if not expected_ids:
        raise HTTPException(status_code=400, detail="Trace has no retrieval items")

    required_temporal = (
        payload.required_temporal
        if payload.required_temporal is not None
        else bool(run.get("temporal_detected"))
    )
    expected = {
        "expected_entry_ids": expected_ids,
        "required_temporal": required_temporal,
    }
    case_name = payload.name or f"From trace {payload.trace_id[:8]}"

    add_eval_case(
        db=db,
        name=case_name,
        query=str(run["query"]),
        case_type=payload.case_type,
        expected=expected,
        active=True,
    )
    return {
        "status": "ok",
        "name": case_name,
        "query": run["query"],
        "expected": expected,
    }


@router.get("/eval/summary")
def eval_summary(window_days: int = Query(14, ge=1, le=180), db: Session = Depends(get_db)):
    return get_eval_summary(db, window_days=window_days)


@router.post("/eval/run")
def run_eval(payload: EvalRunInput, db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT id, name, query, case_type, expected_json, active
            FROM rag_eval_cases
            WHERE (:include_inactive = 1 OR active = 1)
            ORDER BY id ASC
            """
        ),
        {"include_inactive": 1 if payload.include_inactive else 0},
    ).mappings().all()

    if not rows:
        return {"eval_run_id": None, "results": [], "summary": {"cases": 0}}

    import json

    eval_run_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat(timespec="seconds")
    results: list[dict[str, Any]] = []

    for row in rows:
        expected = json.loads(row["expected_json"]) if row.get("expected_json") else {}
        trace_id = start_trace(
            db,
            row["query"],
            history_len=0,
            requested_model=payload.model_name,
        )
        messages, source_entries, retrieval_debug = ChatService.build_messages(
            user_message=row["query"],
            chat_history=[],
            db=db,
        )
        save_retrieval(db, trace_id, retrieval_debug, source_entries)

        answer = ""
        first_token_ms = None
        import time

        stream_started = time.perf_counter()
        for chunk in get_completion_stream(messages, model_name=payload.model_name):
            if first_token_ms is None and chunk:
                first_token_ms = (time.perf_counter() - stream_started) * 1000.0
            answer += chunk
        llm_total_ms = (time.perf_counter() - stream_started) * 1000.0
        finalize_trace(
            db=db,
            trace_id=trace_id,
            answer_text=answer,
            llm_first_token_ms=first_token_ms,
            llm_total_ms=llm_total_ms,
            total_ms=llm_total_ms + (retrieval_debug.get("retrieval_ms") or 0.0),
        )

        retrieval_metrics = compute_retrieval_metrics(
            retrieved_entries=source_entries,
            expected=expected,
            temporal_detected=bool(retrieval_debug.get("temporal_detected")),
        )

        judge = (
            llm_judge_answer(
                query=row["query"],
                answer=answer,
                sources=source_entries,
                model_name=payload.model_name,
            )
            if payload.use_llm_judge
            else {
                "groundedness": None,
                "faithfulness": None,
                "helpfulness": None,
                "citation_adequacy": None,
                "safety_tone": None,
                "trust_answer": None,
                "pass": None,
                "rationale": "llm_judge_disabled",
            }
        )
        if payload.use_llm_judge:
            record_llm_judgment(db, trace_id, judge)

        db.execute(
            text(
                """
                INSERT INTO rag_eval_results(
                    eval_run_id, case_id, trace_id, created_at,
                    precision_at_k, recall_at_k, mrr, ndcg_at_k, temporal_intent_accuracy, date_filter_coverage,
                    groundedness, faithfulness, helpfulness, citation_adequacy, safety_tone, pass, notes
                )
                VALUES(
                    :eval_run_id, :case_id, :trace_id, :created_at,
                    :precision_at_k, :recall_at_k, :mrr, :ndcg_at_k, :temporal_intent_accuracy, :date_filter_coverage,
                    :groundedness, :faithfulness, :helpfulness, :citation_adequacy, :safety_tone, :pass, :notes
                )
                """
            ),
            {
                "eval_run_id": eval_run_id,
                "case_id": row["id"],
                "trace_id": trace_id,
                "created_at": created_at,
                "precision_at_k": retrieval_metrics.precision_at_k,
                "recall_at_k": retrieval_metrics.recall_at_k,
                "mrr": retrieval_metrics.mrr,
                "ndcg_at_k": retrieval_metrics.ndcg_at_k,
                "temporal_intent_accuracy": retrieval_metrics.temporal_intent_accuracy,
                "date_filter_coverage": retrieval_metrics.date_filter_coverage,
                "groundedness": judge.get("groundedness"),
                "faithfulness": judge.get("faithfulness"),
                "helpfulness": judge.get("helpfulness"),
                "citation_adequacy": judge.get("citation_adequacy"),
                "safety_tone": judge.get("safety_tone"),
                "pass": 1 if judge.get("pass") else 0,
                "notes": judge.get("rationale"),
            },
        )
        db.commit()

        results.append(
            {
                "case_id": row["id"],
                "name": row["name"],
                "case_type": row["case_type"],
                "trace_id": trace_id,
                "notes": judge.get("rationale"),
                "metrics": {
                    "precision_at_k": retrieval_metrics.precision_at_k,
                    "recall_at_k": retrieval_metrics.recall_at_k,
                    "mrr": retrieval_metrics.mrr,
                    "ndcg_at_k": retrieval_metrics.ndcg_at_k,
                    "temporal_intent_accuracy": retrieval_metrics.temporal_intent_accuracy,
                    "date_filter_coverage": retrieval_metrics.date_filter_coverage,
                    "groundedness": judge.get("groundedness"),
                    "faithfulness": judge.get("faithfulness"),
                    "helpfulness": judge.get("helpfulness"),
                    "citation_adequacy": judge.get("citation_adequacy"),
                    "safety_tone": judge.get("safety_tone"),
                    "pass": judge.get("pass"),
                },
            }
        )

    summary = db.execute(
        text(
            """
            SELECT
                COUNT(1) AS cases,
                AVG(precision_at_k) AS avg_precision_at_k,
                AVG(recall_at_k) AS avg_recall_at_k,
                AVG(mrr) AS avg_mrr,
                AVG(ndcg_at_k) AS avg_ndcg_at_k,
                AVG(temporal_intent_accuracy) AS avg_temporal_intent_accuracy,
                AVG(groundedness) AS avg_groundedness,
                AVG(faithfulness) AS avg_faithfulness,
                AVG(helpfulness) AS avg_helpfulness,
                AVG(CASE WHEN pass = 1 THEN 1.0 ELSE 0.0 END) AS pass_rate
            FROM rag_eval_results
            WHERE eval_run_id = :eval_run_id
            """
        ),
        {"eval_run_id": eval_run_id},
    ).mappings().first()

    return {"eval_run_id": eval_run_id, "results": results, "summary": dict(summary) if summary else {}}
