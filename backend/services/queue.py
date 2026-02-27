"""
Processing Queue Service
========================
Handles reprocessing of journal entries that were saved without AI metadata
(because both Gemini and Ollama were unavailable at the time of creation).

Entries marked with `pending=True` are retried:
  - On application startup
  - On-demand via the /entries/queue/process endpoint
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.models.journal import JournalEntry
from backend.agent.agents import Agent
from backend.utils import serialize_embedding
from logger.logger import get_logger

logger = get_logger()


def process_pending_entries(db: Session) -> dict:
    """
    Finds all entries with pending=True, attempts AI extraction + embedding,
    and clears the pending flag on success.

    Returns a summary dict with counts of processed, failed, and total entries.
    """
    pending_entries = db.query(JournalEntry).filter(JournalEntry.pending == True).all()

    if not pending_entries:
        logger.info("Queue: No pending entries to process.")
        return {"total": 0, "processed": 0, "failed": 0}

    logger.info(f"Queue: Found {len(pending_entries)} pending entries. Processing…")
    agent = Agent()
    processed = 0
    failed = 0

    for entry in pending_entries:
        try:
            logger.info(f"Queue: Processing entry ID {entry.id}…")

            # --- 1. AI metadata extraction ---
            from backend.schemas.journal import JournalEntryCreate
            extraction = agent.extract(JournalEntryCreate(user_log=entry.user_log))

            entry.emotion = extraction.emotion
            entry.sentiment = extraction.sentiment
            entry.mode = extraction.mode
            entry.summary = extraction.summary
            entry.actionable_insight = extraction.actionable_insight
            entry.tags = ",".join(extraction.tags) if extraction.tags else None
            entry.pending = False

            db.commit()
            db.refresh(entry)
            logger.info(f"Queue: Metadata saved for entry ID {entry.id}")

            # --- 2. Embedding (only if we got a summary) ---
            if extraction.summary:
                try:
                    vector = agent.embedder(extraction.summary)
                    serialized_vector = serialize_embedding(vector)
                    db.execute(
                        text("INSERT OR REPLACE INTO vec_entries(entry_id, embedding) VALUES (:id, :vec)"),
                        {"id": entry.id, "vec": serialized_vector},
                    )
                    db.commit()
                    logger.info(f"Queue: Embedding saved for entry ID {entry.id}")
                except Exception as emb_err:
                    # Embedding failure is non-critical; metadata was already saved.
                    logger.warning(f"Queue: Embedding failed for entry ID {entry.id}: {emb_err}")

            processed += 1

        except Exception as e:
            logger.warning(f"Queue: Still unable to process entry ID {entry.id}: {e}")
            db.rollback()
            failed += 1

    summary = {"total": len(pending_entries), "processed": processed, "failed": failed}
    logger.info(f"Queue: Processing complete — {summary}")
    return summary
