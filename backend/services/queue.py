"""
Processing Queue Service
========================
Handles reprocessing of journal entries that were saved without AI metadata
(because both Gemini and Ollama were unavailable at the time of creation).

Entries marked with `pending=True` are retried:
  - On application startup
  - On-demand via the /entries/queue/process endpoint
  - As a background task after new entry creation
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.models.journal import JournalEntry
from backend.agent.agents import Agent
from backend.utils import serialize_embedding
from backend.database import SessionLocal
from logger.logger import get_logger

logger = get_logger()


def process_single_entry(entry_id: int, model_name: str | None = None) -> bool:
    """
    Process a single pending entry by ID.

    Creates its own DB session so it is safe to call from a background thread.
    Returns True on success, False on failure.
    """
    db = SessionLocal()
    try:
        entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
        if not entry:
            logger.warning(f"Queue: Entry ID {entry_id} not found.")
            return False

        if not entry.pending:
            logger.info(f"Queue: Entry ID {entry_id} already processed, skipping.")
            return True

        logger.info(f"Queue: Processing entry ID {entry.id}…")
        agent = Agent()

        # --- 1. AI metadata extraction ---
        from backend.schemas.journal import JournalEntryCreate
        extraction = agent.extract(
            JournalEntryCreate(user_log=entry.user_log),
            model_name=model_name,
        )

        entry.title = extraction.title
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

        return True

    except Exception as e:
        logger.warning(f"Queue: Failed to process entry ID {entry_id}: {e}")
        db.rollback()
        return False
    finally:
        db.close()


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
    processed = 0
    failed = 0

    for entry in pending_entries:
        success = process_single_entry(entry.id)
        if success:
            processed += 1
        else:
            failed += 1

    summary = {"total": len(pending_entries), "processed": processed, "failed": failed}
    logger.info(f"Queue: Processing complete — {summary}")
    return summary
