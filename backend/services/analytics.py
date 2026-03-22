"""
Analytics service layer for aggregating journal data.

All queries operate against `journal_entries` directly — the project does NOT
have a separate `emotion_records` table. Sentiment is stored as an Integer
(-1, 0, 1) and tags are stored as a comma-separated string.
"""

import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
from collections import Counter

from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.config import DATA_DIR
from backend.models.journal import JournalEntry
from backend.agent.agents import Agent

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

def get_sentiment_over_time(
    db: Session, range_str: str = "30d"
) -> List[Dict[str, Any]]:
    """
    Returns a list of { date, average_sentiment, context } dicts grouped by calendar
    day within the requested range. Only days that have entries are returned.
    """
    from collections import defaultdict

    cutoff = _parse_range(range_str)

    entries = (
        db.query(JournalEntry)
        .filter(
            JournalEntry.date >= cutoff,
            JournalEntry.sentiment.isnot(None),
        )
        .order_by(JournalEntry.date.asc())
        .all()
    )

    day_groups = defaultdict(list)
    for entry in entries:
        day_str = str(entry.date.date())
        day_groups[day_str].append(entry)

    results = []
    for day_str, day_entries in sorted(day_groups.items()):
        avg_sentiment = sum(e.sentiment for e in day_entries) / len(day_entries)

        # Determine context
        count = len(day_entries)

        # Most common tag
        all_tags = []
        for e in day_entries:
            if e.tags:
                all_tags.extend([t.strip() for t in e.tags.split(",") if t.strip()])
        common_tag = max(set(all_tags), key=all_tags.count) if all_tags else None

        # Most common emotion
        emotions = [e.emotion for e in day_entries if e.emotion]
        common_emotion = max(set(emotions), key=emotions.count) if emotions else None

        context_lines = []
        if count == 1:
            entry = day_entries[0]
            emo = entry.emotion.capitalize() if entry.emotion else ""
            tags_list = [t.strip() for t in entry.tags.split(",") if t.strip()] if entry.tags else []
            tag_str = ", ".join(tags_list)

            if emo:
                context_lines.append(f"Emotion: {emo}")
            if tag_str:
                context_lines.append(f"Tags: {tag_str}")
                
            if not context_lines:
                if entry.title:
                    context_lines.append(entry.title)
                else:
                    context_lines.append("1 journal entry")
        else:
            context_lines.append(f"{count} entries")
            if common_emotion:
                context_lines.append(f"Dominant emotion: {common_emotion.capitalize()}")
            if common_tag:
                context_lines.append(f"Top tag: {common_tag}")

        context = "\n".join(context_lines)

        results.append({
            "date": day_str,
            "average_sentiment": round(float(avg_sentiment), 4),
            "context": context
        })

    return results


def get_emotion_frequency(
    db: Session, range_str: str = "30d", refresh: bool = False, model_name: str | None = None
) -> List[Dict[str, Any]]:
    """
    Returns a list of { emotion, count, trend, trend_percent, insight } dicts sorted descending by count.
    """
    cutoff = _parse_range(range_str)
    
    # Calculate previous period for trend comparison
    try:
        days = int(range_str.rstrip("d"))
    except (ValueError, AttributeError):
        days = 30
    prev_cutoff = cutoff - timedelta(days=days)

    # 1. Get current period counts
    current_rows = (
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

    # 2. Get previous period counts
    prev_rows = (
        db.query(
            JournalEntry.emotion,
            func.count(JournalEntry.id).label("cnt"),
        )
        .filter(
            JournalEntry.date >= prev_cutoff,
            JournalEntry.date < cutoff,
            JournalEntry.emotion.isnot(None),
            JournalEntry.emotion != "",
        )
        .group_by(JournalEntry.emotion)
        .all()
    )
    prev_counts = {row.emotion: row.cnt for row in prev_rows}

    # --- CACHE ---
    CACHE_FILE = DATA_DIR / f"emotion_insights_cache_{range_str}.json"
    cache_data = {}
    if not refresh and CACHE_FILE.exists():
        try:
            cache_data = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass

    results = []
    cache_updated = False
    agent = None

    for idx, row in enumerate(current_rows):
        emotion = row.emotion
        count = row.cnt
        
        # Calculate trend
        prev_count = prev_counts.get(emotion, 0)
        if prev_count == 0:
            trend = "up"
            percent = 100
        else:
            percent = int(round(((count - prev_count) / max(prev_count, 1)) * 100))
            if percent > 5:
                trend = "up"
            elif percent < -5:
                trend = "down"
            else:
                trend = "stable"

        insight = None
        # Only generate insight for top 3
        if idx < 3:
            if not refresh and emotion in cache_data and cache_data[emotion].get("count") == count:
                insight = cache_data[emotion].get("insight")
            else:
                if not agent:
                    from backend.agent.agents import Agent
                    agent = Agent()
                
                # Fetch tags/topics for this emotion in this period
                emotion_entries = db.query(JournalEntry.tags, JournalEntry.mode).filter(
                    JournalEntry.date >= cutoff,
                    JournalEntry.emotion == emotion
                ).all()
                
                topics_set = set()
                for e in emotion_entries:
                    if e.mode:
                        topics_set.add(e.mode.lower())
                    if e.tags:
                        topics_set.update([t.strip().lower() for t in e.tags.split(",") if t.strip()])
                
                topics_str = ", ".join(list(topics_set)[:10]) or "general life"
                try:
                    insight = agent.generate_emotion_insight(emotion, topics_str, model_name=model_name)
                    cache_data[emotion] = {"count": count, "insight": insight}
                    cache_updated = True
                except Exception as e:
                    from logger.logger import get_logger
                    get_logger().error(f"Failed to generate emotion insight: {e}")
                    insight = f"Often linked with '{list(topics_set)[0] if topics_set else 'general things'}'"

        results.append({
            "emotion": emotion,
            "count": count,
            "trend": trend,
            "trend_percent": abs(percent),
            "insight": insight
        })
        
    if cache_updated:
        try:
            CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
            CACHE_FILE.write_text(json.dumps(cache_data), encoding="utf-8")
        except Exception:
            pass

    return results


def get_tag_frequency(
    db: Session, range_str: str = "30d", refresh: bool = False, model_name: str | None = None
) -> Dict[str, Any]:
    """
    Returns a dictionary containing top tags (with days_active) and AI insights for emerging/dormant tags.
    """
    from collections import defaultdict
    cutoff = _parse_range(range_str)
    
    try:
        days = int(range_str.rstrip("d"))
    except (ValueError, AttributeError):
        days = 30
    prev_cutoff = cutoff - timedelta(days=days)

    # Fetch current period
    current_entries = db.query(JournalEntry.tags, JournalEntry.date).filter(
        JournalEntry.date >= cutoff, 
        JournalEntry.tags.isnot(None), 
        JournalEntry.tags != ""
    ).all()
    
    # Fetch prev period
    prev_entries = db.query(JournalEntry.tags).filter(
        JournalEntry.date >= prev_cutoff, 
        JournalEntry.date < cutoff,
        JournalEntry.tags.isnot(None), 
        JournalEntry.tags != ""
    ).all()

    current_tag_counts = Counter()
    current_tag_days = defaultdict(set)
    for row in current_entries:
        for t in row.tags.split(","):
            cleaned = t.strip()
            if cleaned:
                current_tag_counts[cleaned] += 1
                current_tag_days[cleaned].add(row.date.date())

    prev_tag_counts = Counter()
    for row in prev_entries:
        for t in row.tags.split(","):
            cleaned = t.strip()
            if cleaned:
                prev_tag_counts[cleaned] += 1
                
    # Emerging: Top increased count from 0 or low
    emerging_candidates = []
    for tag, current_count in current_tag_counts.items():
        prev_count = prev_tag_counts.get(tag, 0)
        if current_count > prev_count:
            emerging_candidates.append((tag, current_count - prev_count, current_count))
    emerging_candidates.sort(key=lambda x: (x[1], x[2]), reverse=True)
    top_emerging = emerging_candidates[:3]

    # Dormant: High in prev, 0 in current
    dormant_candidates = []
    for tag, prev_count in prev_tag_counts.items():
        if tag not in current_tag_counts:
            dormant_candidates.append((tag, prev_count))
    dormant_candidates.sort(key=lambda x: x[1], reverse=True)
    top_dormant = dormant_candidates[:3]

    emerging_str = ", ".join([f"'{t[0]}' (appeared {t[2]} times)" for t in top_emerging]) if top_emerging else "None"
    dormant_str = ", ".join([f"'{t[0]}'" for t in top_dormant]) if top_dormant else "None"

    # CACHE logic
    CACHE_FILE = DATA_DIR / f"tag_insights_cache_{range_str}.json"
    cache_data = {}
    if not refresh and CACHE_FILE.exists():
        try:
            cache_data = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        except Exception: 
            pass

    # Compare cache counts
    cache_key = f"{emerging_str}|{dormant_str}"
    insight = cache_data.get("insight")
    if refresh or cache_data.get("cache_key") != cache_key or insight is None:
        if top_emerging or top_dormant:
            from backend.agent.agents import Agent
            agent = Agent()
            try:
                insight = agent.generate_tag_insight(emerging_str, dormant_str, model_name=model_name)
                cache_data = {"cache_key": cache_key, "insight": insight}
                CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
                CACHE_FILE.write_text(json.dumps(cache_data), encoding="utf-8")
            except Exception as e:
                from logger.logger import get_logger
                get_logger().error(f"Failed to generate tag insight: {e}")
                insight = {"emerging": "", "dormant": ""}
        else:
             insight = {"emerging": "No emerging topics right now.", "dormant": "No dormant topics detected."}

    top_tags_list = sorted(
        [
            {
                "tag": tag, 
                "count": count, 
                "days_active": len(current_tag_days[tag]), 
                "total_days": days
            } for tag, count in current_tag_counts.items()
        ],
        key=lambda x: x["count"],
        reverse=True,
    )[:5]

    return {
        "top_tags": top_tags_list,
        "insight": insight
    }


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


def get_hero_insight(db: Session, range_str: str = "30d", model_name: str | None = None) -> dict[str, Any]:
    """
    Fetches analytics for the requested range, formats them as context,
    and uses the Agent to generate a one-sentence hero insight.
    """
    cutoff = _parse_range(range_str)

    # 1. Gather recent entries to understand context
    recent_entries = (
        db.query(JournalEntry)
        .filter(JournalEntry.date >= cutoff, JournalEntry.pending == False)
        .order_by(JournalEntry.date.desc())
        .limit(20)
        .all()
    )

    if not recent_entries:
        return {"insight": "Start journaling to unlock your first insight."}

    # 2. Get basic analytics
    streak_data = get_streak_data(db)
    current_total_entries = streak_data["total_entries"]

    # --- CACHE CHECK ---
    INSIGHT_CACHE_FILE = DATA_DIR / f"hero_insight_cache_{range_str}.json"
    if INSIGHT_CACHE_FILE.exists():
        try:
            cache_data = json.loads(INSIGHT_CACHE_FILE.read_text(encoding="utf-8"))
            last_count = cache_data.get("last_entry_count", 0)
            cached_insight = cache_data.get("insight")
            # If we haven't crossed the 10-entry threshold and we have a valid insight
            if current_total_entries - last_count < 10 and cached_insight:
                return {"insight": cached_insight}
        except Exception as e:
            # If cache is broken, ignore it and re-generate
            pass

    emotions = get_emotion_frequency(db, range_str)
    modes = get_mode_frequency(db, range_str)

    # 3. Format as a readable context string
    context_lines = []
    
    context_lines.append(f"Streak: {streak_data['current_streak']} days")
    context_lines.append(f"Total entries: {current_total_entries}")
    
    if emotions:
        top_emotions = ", ".join([f"{e['emotion']} ({e['count']})" for e in emotions[:3]])
        context_lines.append(f"Top Emotions: {top_emotions}")
        
    if modes:
        top_modes = ", ".join([f"{m['mode']} ({m['count']})" for m in modes[:3]])
        context_lines.append(f"Top Modes/Topics: {top_modes}")
        
    context_lines.append("\nRecent summaries:")
    for entry in recent_entries[:5]:  # Include up to 5 summaries for deep context
        if entry.summary:
            context_lines.append(f"- {entry.date.strftime('%Y-%m-%d')}: {entry.summary} (Sentiment: {entry.sentiment}, Emotion: {entry.emotion})")

    analytics_context = "\n".join(context_lines)

    # 4. Generate the insight
    try:
        agent = Agent()
        insight = agent.generate_hero_insight(analytics_context, model_name=model_name)
    except Exception as e:
        # Fallback if AI fails completely
        insight = f"You've been tracking a lot about {modes[0]['mode'] if modes else 'your life'} recently. Keep it up!"

    # --- SAVE TO CACHE ---
    try:
        INSIGHT_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        INSIGHT_CACHE_FILE.write_text(
            json.dumps({
                "insight": insight,
                "last_entry_count": current_total_entries
            }), 
            encoding="utf-8"
        )
    except Exception as e:
        # Silently fail if we can't write to cache, it will just re-generate next time
        pass

    return {"insight": insight}
