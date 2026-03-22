"""
Re-embedding Service
====================
One-time (or on-demand) script to re-embed all existing journal entries
using the full `user_log` instead of the old `summary`-only approach.

This ensures consistency between new entries (which embed user_log)
and older entries (which were embedded from summary).
"""

from sqlalchemy import text
from backend.models.journal import JournalEntry
from backend.agent.agents import Agent
from backend.utils import serialize_embedding
from backend.database import SessionLocal
from logger.logger import get_logger

logger = get_logger()


def reembed_all_entries() -> dict:
    """
    Iterate through all non-pending journal entries and re-embed them
    using the full `user_log` text.

    Returns a summary dict with counts.
    """
    db = SessionLocal()
    agent = Agent()

    try:
        entries = (
            db.query(JournalEntry)
            .filter(JournalEntry.pending == False)
            .order_by(JournalEntry.id)
            .all()
        )

        if not entries:
            logger.info("Re-embed: No entries to re-embed.")
            return {"total": 0, "success": 0, "failed": 0}

        logger.info(f"Re-embed: Starting re-embedding of {len(entries)} entries...")
        success = 0
        failed = 0

        for entry in entries:
            try:
                if not entry.user_log:
                    logger.warning(f"Re-embed: Entry {entry.id} has no user_log, skipping.")
                    failed += 1
                    continue

                vector = agent.embedder(entry.user_log)
                serialized_vector = serialize_embedding(vector)

                db.execute(
                    text(
                        "INSERT OR REPLACE INTO vec_entries(entry_id, embedding) "
                        "VALUES (:id, :vec)"
                    ),
                    {"id": entry.id, "vec": serialized_vector},
                )
                db.commit()
                success += 1
                logger.info(f"Re-embed: Entry {entry.id} re-embedded successfully ({success}/{len(entries)})")

            except Exception as e:
                logger.warning(f"Re-embed: Failed to re-embed entry {entry.id}: {e}")
                db.rollback()
                failed += 1

        summary = {"total": len(entries), "success": success, "failed": failed}
        logger.info(f"Re-embed: Complete — {summary}")
        return summary

    except Exception as e:
        logger.error(f"Re-embed: Fatal error: {e}")
        return {"total": 0, "success": 0, "failed": 0, "error": str(e)}
    finally:
        db.close()
