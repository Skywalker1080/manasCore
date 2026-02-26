"""
Analytics service layer for aggregating journal data.

All queries operate against `journal_entries` directly — the project does NOT
have a separate `emotion_records` table. Sentiment is stored as an Integer
(-1, 0, 1) and tags are stored as a comma-separated string.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any
from collections import Counter

from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models.journal import JournalEntry


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_range(range_str: str) -> datetime:
    """
    Convert a range string like '7d' or '30d' into a datetime cutoff.
    Defaults to 30 days if the format is unrecognised.
    """
    try:
        days = int(range_str.rstrip("d"))
    except (ValueError, AttributeError):
        days = 30
    return datetime.utcnow() - timedelta(days=days)


# ---------------------------------------------------------------------------
# Analytics Queries
# ---------------------------------------------------------------------------

def get_sentiment_over_time(
    db: Session, range_str: str = "30d"
) -> List[Dict[str, Any]]:
    """
    Returns a list of { date, average_sentiment } dicts grouped by calendar
    day within the requested range.  Only days that have entries are returned.
    """
    cutoff = _parse_range(range_str)

    # Use SQLite's date() function to extract the date part from datetime strings
    day_col = func.date(JournalEntry.date)

    rows = (
        db.query(
            day_col.label("day"),
            func.avg(JournalEntry.sentiment).label("avg_sentiment"),
        )
        .filter(
            JournalEntry.date >= cutoff,
            JournalEntry.sentiment.isnot(None),
        )
        .group_by(day_col)
        .order_by(day_col)
        .all()
    )

    return [
        {"date": str(row.day), "average_sentiment": round(float(row.avg_sentiment), 4)}
        for row in rows
    ]


def get_emotion_frequency(
    db: Session, range_str: str = "30d"
) -> List[Dict[str, Any]]:
    """
    Returns a list of { emotion, count } dicts sorted descending by count.
    """
    cutoff = _parse_range(range_str)

    rows = (
        db.query(
            JournalEntry.emotion,
            func.count(JournalEntry.id).label("cnt"),
        )
        .filter(
            JournalEntry.date >= cutoff,
            JournalEntry.emotion.isnot(None),
            JournalEntry.emotion != "",
        )
        .group_by(JournalEntry.emotion)
        .order_by(func.count(JournalEntry.id).desc())
        .all()
    )

    return [{"emotion": row.emotion, "count": row.cnt} for row in rows]


def get_tag_frequency(db: Session) -> List[Dict[str, Any]]:
    """
    Tags are stored as comma-separated strings on journal_entries.tags.
    We pull all non-null tag strings, split them, and count across entries.
    """
    rows = (
        db.query(JournalEntry.tags)
        .filter(
            JournalEntry.tags.isnot(None),
            JournalEntry.tags != "",
        )
        .all()
    )

    counter: Counter = Counter()
    for (tags_str,) in rows:
        for tag in tags_str.split(","):
            cleaned = tag.strip()
            if cleaned:
                counter[cleaned] += 1

    return sorted(
        [{"tag": tag, "count": count} for tag, count in counter.items()],
        key=lambda x: x["count"],
        reverse=True,
    )


def get_streak_data(db: Session) -> Dict[str, int]:
    """
    Returns { current_streak, longest_streak, total_entries }.
    Streak = consecutive calendar days (ending today) with at least one entry.
    """
    total = db.query(func.count(JournalEntry.id)).scalar() or 0

    if total == 0:
        return {"current_streak": 0, "longest_streak": 0, "total_entries": 0}

    # Use SQLite's date() to extract the date part, returns strings like '2026-02-26'
    day_col = func.date(JournalEntry.date)

    distinct_dates = (
        db.query(day_col)
        .distinct()
        .order_by(day_col.desc())
        .all()
    )

    if not distinct_dates:
        return {"current_streak": 0, "longest_streak": 0, "total_entries": total}

    # Convert string dates to date objects
    from datetime import date as date_type
    dates = sorted(
        {date_type.fromisoformat(row[0]) for row in distinct_dates},
        reverse=True,
    )

    # --- Current streak ---
    today = datetime.utcnow().date()
    current_streak = 0
    expected = today

    for d in dates:
        if d == expected:
            current_streak += 1
            expected -= timedelta(days=1)
        elif d < expected:
            # There's a gap — stop counting
            break

    # --- Longest streak ---
    sorted_asc = sorted(dates)
    longest = 1
    streak = 1
    for i in range(1, len(sorted_asc)):
        if (sorted_asc[i] - sorted_asc[i - 1]).days == 1:
            streak += 1
            longest = max(longest, streak)
        else:
            streak = 1

    return {
        "current_streak": current_streak,
        "longest_streak": max(longest, current_streak),
        "total_entries": total,
    }


def get_mode_frequency(
    db: Session, range_str: str = "30d"
) -> List[Dict[str, Any]]:
    """
    Bonus: mode/category breakdown (Work, Personal, etc.)
    Returns a list of { mode, count } dicts sorted descending by count.
    """
    cutoff = _parse_range(range_str)

    rows = (
        db.query(
            JournalEntry.mode,
            func.count(JournalEntry.id).label("cnt"),
        )
        .filter(
            JournalEntry.date >= cutoff,
            JournalEntry.mode.isnot(None),
            JournalEntry.mode != "",
        )
        .group_by(JournalEntry.mode)
        .order_by(func.count(JournalEntry.id).desc())
        .all()
    )

    return [{"mode": row.mode, "count": row.cnt} for row in rows]
