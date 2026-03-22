"""
Chat service: hybrid RAG pipeline for contextual conversations.
"""

from __future__ import annotations

import re
import statistics
import time
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.agent.llm_client import get_embeddings
from backend.agent.prompts import CHAT_SYSTEM_PROMPT
from backend.services.profile import ProfileService
from backend.utils import serialize_embedding
from logger.logger import get_logger

logger = get_logger()

_RELATIVE_PATTERNS: list[tuple[str, callable]] = []


def _build_relative_patterns():
    def _today(_m, now):
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return start, now

    def _yesterday(_m, now):
        y = now - timedelta(days=1)
        start = y.replace(hour=0, minute=0, second=0, microsecond=0)
        end = y.replace(hour=23, minute=59, second=59)
        return start, end

    def _this_week(_m, now):
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        return start, now

    def _last_week(_m, now):
        this_monday = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        start = this_monday - timedelta(days=7)
        end = this_monday - timedelta(seconds=1)
        return start, end

    def _past_n_days(m, now):
        n = int(m.group("n"))
        start = (now - timedelta(days=n)).replace(hour=0, minute=0, second=0, microsecond=0)
        return start, now

    def _this_month(_m, now):
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return start, now

    def _last_month(_m, now):
        first_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = first_this_month - timedelta(seconds=1)
        start = end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return start, end

    def _named_month(m, now):
        month_names = {
            "january": 1,
            "february": 2,
            "march": 3,
            "april": 4,
            "may": 5,
            "june": 6,
            "july": 7,
            "august": 8,
            "september": 9,
            "october": 10,
            "november": 11,
            "december": 12,
            "jan": 1,
            "feb": 2,
            "mar": 3,
            "apr": 4,
            "jun": 6,
            "jul": 7,
            "aug": 8,
            "sep": 9,
            "sept": 9,
            "oct": 10,
            "nov": 11,
            "dec": 12,
        }
        month_num = month_names.get(m.group("month").lower())
        if not month_num:
            return None

        year = now.year
        if month_num > now.month:
            year -= 1
        start = datetime(year, month_num, 1)
        if month_num == 12:
            end = datetime(year + 1, 1, 1) - timedelta(seconds=1)
        else:
            end = datetime(year, month_num + 1, 1) - timedelta(seconds=1)
        return start, end

    def _past_n_weeks(m, now):
        n = int(m.group("n"))
        start = (now - timedelta(weeks=n)).replace(hour=0, minute=0, second=0, microsecond=0)
        return start, now

    def _date_range(m, now):
        from_str = m.group("from_date").strip()
        to_str = m.group("to_date").strip()

        start = _parse_flexible_date(from_str, now)
        end = _parse_flexible_date(to_str, now)
        if start and end:
            start = start.replace(hour=0, minute=0, second=0, microsecond=0)
            end = end.replace(hour=23, minute=59, second=59)
            return start, end
        return None

    return [
        (r"\btoday\b", _today),
        (r"\byesterday\b", _yesterday),
        (r"\bthis\s+week\b", _this_week),
        (r"\blast\s+week\b", _last_week),
        (r"\bpast\s+(?P<n>\d+)\s+days?\b", _past_n_days),
        (r"\blast\s+(?P<n>\d+)\s+days?\b", _past_n_days),
        (r"\bpast\s+(?P<n>\d+)\s+weeks?\b", _past_n_weeks),
        (r"\blast\s+(?P<n>\d+)\s+weeks?\b", _past_n_weeks),
        (r"\bthis\s+month\b", _this_month),
        (r"\blast\s+month\b", _last_month),
        (r"\bfrom\s+(?P<from_date>.+?)\s+(?:to|till|until|present)\s+(?P<to_date>.+)\b", _date_range),
        (
            r"\b(?:in\s+)?(?P<month>january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b",
            _named_month,
        ),
    ]


def _parse_flexible_date(text_value: str, now: datetime) -> datetime | None:
    text_value = text_value.strip().lower()
    if text_value in ("now", "present", "today"):
        return now
    if text_value == "yesterday":
        return now - timedelta(days=1)

    cleaned = re.sub(
        r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*",
        "",
        text_value,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"(\d+)(st|nd|rd|th)", r"\1", cleaned).strip()

    formats = [
        "%d %B %Y",
        "%d %B",
        "%B %d %Y",
        "%B %d",
        "%d %b %Y",
        "%d %b",
        "%b %d %Y",
        "%b %d",
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%d-%m-%Y",
        "%m-%d-%Y",
    ]
    for fmt in formats:
        try:
            parsed = datetime.strptime(cleaned, fmt)
            if "%Y" not in fmt:
                parsed = parsed.replace(year=now.year)
            return parsed
        except ValueError:
            continue
    return None


_RELATIVE_PATTERNS = _build_relative_patterns()


class ChatService:
    @staticmethod
    def detect_temporal_intent_details(query: str) -> dict[str, Any] | None:
        now = datetime.now()
        q = query.lower()
        for pattern, resolver in _RELATIVE_PATTERNS:
            match = re.search(pattern, q, re.IGNORECASE)
            if not match:
                continue
            result = resolver(match, now)
            if not result:
                continue
            start, end = result
            logger.info(
                f"Temporal intent detected: '{match.group()}' → "
                f"{start.strftime('%Y-%m-%d')} to {end.strftime('%Y-%m-%d')}"
            )
            return {
                "matched_text": match.group(),
                "start": start,
                "end": end,
                "pattern": pattern,
            }
        logger.info(f"No temporal intent detected in query: '{query[:60]}'")
        return None

    @staticmethod
    def search_entries_by_date(start_date: datetime, end_date: datetime, db: Session) -> list[dict]:
        try:
            results = (
                db.execute(
                    text(
                        """
                        SELECT id, user_log, summary, emotion, mode, date
                        FROM journal_entries
                        WHERE date BETWEEN :start AND :end
                          AND pending = 0
                        ORDER BY date DESC
                        """
                    ),
                    {"start": start_date, "end": end_date},
                )
                .mappings()
                .all()
            )
            entries = [
                {
                    "entry_id": row["id"],
                    "user_log": row["user_log"],
                    "summary": row["summary"],
                    "emotion": row["emotion"],
                    "mode": row["mode"],
                    "date": str(row["date"]),
                    "distance": 0.0,
                    "retrieval_method": "date_filtered",
                }
                for row in results
            ]
            logger.info(
                f"Date-filtered search: {len(entries)} entries between "
                f"{start_date.strftime('%Y-%m-%d')} and {end_date.strftime('%Y-%m-%d')}"
            )
            return entries
        except Exception as e:
            logger.warning(f"Date-filtered search failed: {e}")
            return []

    @staticmethod
    def search_similar_entries(
        query: str,
        db: Session,
        top_k: int = 10,
        distance_threshold: float = 1.5,
    ) -> tuple[list[dict], dict[str, Any]]:
        debug: dict[str, Any] = {
            "requested_top_k": top_k,
            "distance_threshold": distance_threshold,
            "raw_count": 0,
            "returned_count": 0,
            "filtered_out_count": 0,
            "embed_ms": None,
            "search_ms": None,
            "distance_min": None,
            "distance_p50": None,
            "distance_p95": None,
            "distance_max": None,
        }
        try:
            embed_started = time.perf_counter()
            query_embedding = get_embeddings(query)
            debug["embed_ms"] = (time.perf_counter() - embed_started) * 1000.0
            serialized = serialize_embedding(query_embedding)

            search_started = time.perf_counter()
            results = (
                db.execute(
                    text(
                        """
                        SELECT
                            v.entry_id,
                            v.distance,
                            j.user_log,
                            j.summary,
                            j.emotion,
                            j.mode,
                            j.date
                        FROM vec_entries v
                        JOIN journal_entries j ON j.id = v.entry_id
                        WHERE embedding MATCH :query
                          AND k = :k
                        ORDER BY v.distance
                        """
                    ),
                    {"query": serialized, "k": top_k},
                )
                .mappings()
                .all()
            )
            debug["search_ms"] = (time.perf_counter() - search_started) * 1000.0
            debug["raw_count"] = len(results)

            distances = [float(row["distance"]) for row in results if row.get("distance") is not None]
            if distances:
                sorted_d = sorted(distances)
                p50 = statistics.median(sorted_d)
                p95_index = min(len(sorted_d) - 1, max(0, int(math_floor(0.95 * len(sorted_d)) - 1)))
                p95 = sorted_d[p95_index]
                debug["distance_min"] = sorted_d[0]
                debug["distance_p50"] = p50
                debug["distance_p95"] = p95
                debug["distance_max"] = sorted_d[-1]

            entries = []
            for row in results:
                if row["distance"] > distance_threshold:
                    continue
                entries.append(
                    {
                        "entry_id": row["entry_id"],
                        "user_log": row["user_log"],
                        "summary": row["summary"],
                        "emotion": row["emotion"],
                        "mode": row["mode"],
                        "date": str(row["date"]),
                        "distance": row["distance"],
                        "retrieval_method": "semantic",
                    }
                )
            debug["returned_count"] = len(entries)
            debug["filtered_out_count"] = max(0, debug["raw_count"] - debug["returned_count"])
            return entries, debug
        except Exception as e:
            logger.warning(f"Similarity search failed: {e}")
            return [], debug

    @classmethod
    def hybrid_search(cls, query: str, db: Session) -> tuple[list[dict], dict[str, Any]]:
        started = time.perf_counter()
        temporal = cls.detect_temporal_intent_details(query)
        debug: dict[str, Any] = {
            "temporal_detected": bool(temporal),
            "temporal_phrase": temporal["matched_text"] if temporal else None,
            "temporal_start": temporal["start"].isoformat() if temporal else None,
            "temporal_end": temporal["end"].isoformat() if temporal else None,
            "retrieval_mode": "semantic",
            "requested_top_k": 10,
            "returned_count": 0,
            "threshold_filtered_count": 0,
            "distance_min": None,
            "distance_p50": None,
            "distance_p95": None,
            "distance_max": None,
            "embed_ms": None,
            "retrieval_ms": None,
        }

        if temporal:
            start_date = temporal["start"]
            end_date = temporal["end"]
            logger.info(f"Hybrid search: TEMPORAL mode for '{query[:60]}'")
            debug["retrieval_mode"] = "temporal_plus_semantic"
            date_entries = cls.search_entries_by_date(start_date, end_date, db)
            vector_entries, vector_debug = cls.search_similar_entries(query, db, top_k=5)
            seen_ids = {e["entry_id"] for e in date_entries}
            merged = list(date_entries)
            for entry in vector_entries:
                if entry["entry_id"] in seen_ids:
                    continue
                merged.append(entry)
                seen_ids.add(entry["entry_id"])

            debug["requested_top_k"] = 5
            debug["returned_count"] = len(merged)
            debug["threshold_filtered_count"] = vector_debug.get("filtered_out_count")
            debug["distance_min"] = vector_debug.get("distance_min")
            debug["distance_p50"] = vector_debug.get("distance_p50")
            debug["distance_p95"] = vector_debug.get("distance_p95")
            debug["distance_max"] = vector_debug.get("distance_max")
            debug["embed_ms"] = vector_debug.get("embed_ms")
            debug["retrieval_ms"] = (time.perf_counter() - started) * 1000.0
            logger.info(
                f"Hybrid result: {len(date_entries)} date-filtered + "
                f"{len(merged) - len(date_entries)} semantic = {len(merged)} total"
            )
            return merged, debug

        logger.info(f"Hybrid search: SEMANTIC mode for '{query[:60]}'")
        semantic_entries, semantic_debug = cls.search_similar_entries(query, db, top_k=10)
        debug["requested_top_k"] = semantic_debug.get("requested_top_k")
        debug["returned_count"] = semantic_debug.get("returned_count")
        debug["threshold_filtered_count"] = semantic_debug.get("filtered_out_count")
        debug["distance_min"] = semantic_debug.get("distance_min")
        debug["distance_p50"] = semantic_debug.get("distance_p50")
        debug["distance_p95"] = semantic_debug.get("distance_p95")
        debug["distance_max"] = semantic_debug.get("distance_max")
        debug["embed_ms"] = semantic_debug.get("embed_ms")
        debug["retrieval_ms"] = (time.perf_counter() - started) * 1000.0
        return semantic_entries, debug

    @staticmethod
    def load_profile_context() -> dict[str, str]:
        profiles = {}
        for name in ["personality", "vision", "goals"]:
            try:
                profiles[name] = ProfileService.get_profile_content(name)
            except Exception as e:
                logger.warning(f"Could not load profile '{name}': {e}")
                profiles[name] = f"No {name} profile defined yet."
        return profiles

    @staticmethod
    def build_journal_context(entries: list[dict]) -> str:
        if not entries:
            return "No relevant journal entries found yet. The user is just getting started."

        lines = []
        for i, entry in enumerate(entries, 1):
            date = entry["date"][:10] if entry["date"] else "Unknown date"
            content = entry.get("user_log", "") or ""
            if len(content) > 500:
                content = content[:500] + "..."
            if not content:
                content = entry.get("summary", "") or "No content available."

            emotion = entry.get("emotion", "Unknown")
            mode = entry.get("mode", "Unknown")
            method = entry.get("retrieval_method", "semantic")
            tag = "[Date-filtered]" if method == "date_filtered" else "[Semantically similar]"
            lines.append(
                f"[Entry {i} - {date}] {tag} (Emotion: {emotion}, Mode: {mode})\n{content}"
            )
        return "\n\n".join(lines)

    @classmethod
    def build_messages(
        cls,
        user_message: str,
        chat_history: list[dict],
        db: Session,
    ) -> tuple[list[dict], list[dict], dict[str, Any]]:
        source_entries, retrieval_debug = cls.hybrid_search(user_message, db)
        profiles = cls.load_profile_context()
        journal_context = cls.build_journal_context(source_entries)
        current_date = datetime.now().strftime("%A, %B %d, %Y")

        system_content = CHAT_SYSTEM_PROMPT.format(
            personality=profiles["personality"],
            vision=profiles["vision"],
            goals=profiles["goals"],
            journal_context=journal_context,
            current_date=current_date,
        )

        messages = [{"role": "system", "content": system_content}]
        for msg in chat_history[-20:]:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        messages.append({"role": "user", "content": user_message})

        return messages, source_entries, retrieval_debug


def math_floor(value: float) -> int:
    return int(value // 1)
