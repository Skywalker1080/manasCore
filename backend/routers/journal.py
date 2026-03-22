from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models.journal import JournalEntry
from backend.schemas.journal import JournalEntryCreate, JournalEntryResponse
from backend.services.queue import process_pending_entries, process_single_entry
from logger.logger import get_logger
import json
from sqlalchemy import text
from backend.utils import serialize_embedding

router = APIRouter(prefix="/entries", tags=["journal"])
logger = get_logger()

@router.post("/", response_model=JournalEntryResponse, status_code=status.HTTP_202_ACCEPTED)
def create_entry(
    entry: JournalEntryCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Save the journal entry immediately with pending=True and return.
    AI metadata extraction + embedding run in the background.
    """
    logger.info("Received request to create a new journal entry (async)")
    try:
        # --- Save the entry immediately as pending ---
        db_entry = JournalEntry(
            user_log=entry.user_log,
            pending=True,
        )
        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)
        logger.info(f"Journal entry saved with ID: {db_entry.id} (pending=True, async)")

        # --- Dispatch background processing ---
        background_tasks.add_task(process_single_entry, db_entry.id, entry.model_name)

        return db_entry
    except Exception as e:
        logger.error(f"Error creating journal entry: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while saving your entry: {str(e)}"
        )

@router.get("/", response_model=List[JournalEntryResponse])
def read_entries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    logger.info(f"Reading journal entries with skip={skip} and limit={limit}")
    return db.query(JournalEntry).order_by(JournalEntry.date.desc()).offset(skip).limit(limit).all()

@router.get("/queue/status")
def queue_status(db: Session = Depends(get_db)):
    """Returns the count of pending (unprocessed) entries."""
    count = db.query(JournalEntry).filter(JournalEntry.pending == True).count()
    return {"pending_count": count}

@router.post("/queue/process")
def process_queue(db: Session = Depends(get_db)):
    """Manually trigger reprocessing of all pending entries."""
    logger.info("Manual queue processing triggered via API")
    result = process_pending_entries(db)
    return result

@router.get("/{entry_id}", response_model=JournalEntryResponse)
def read_entry(entry_id: int, db: Session = Depends(get_db)):
    logger.info(f"Reading journal entry with ID: {entry_id}")
    db_entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if db_entry is None:
        logger.warning(f"Journal entry with ID {entry_id} not found")
        raise HTTPException(status_code=404, detail="Entry not found")
    return db_entry

@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    logger.info(f"Deleting journal entry with ID: {entry_id}")
    db_entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if db_entry is None:
        logger.warning(f"Journal entry with ID {entry_id} not found for deletion")
        raise HTTPException(status_code=404, detail="Entry not found")
    
    # Also delete from vec_entries
    try:
        db.execute(text("DELETE FROM vec_entries WHERE entry_id = :id"), {"id": entry_id})
        db.delete(db_entry)
        db.commit()
        logger.info(f"Journal entry {entry_id} deleted successfully")
    except Exception as e:
        logger.error(f"Error deleting journal entry {entry_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete entry")
    
    return None

@router.get("/debug/vectors")
def debug_vectors(db: Session = Depends(get_db)):
    """
    Debug endpoint to verify stored embeddings in the vec_entries virtual table.
    """
    logger.info("Debug: Fetching vector entries from vec_entries table")
    try:
        # We use vec_to_json to convert the blob back to a readable snippet for verification
        result = db.execute(text(
            "SELECT entry_id, vec_to_json(embedding) as vector_json FROM vec_entries LIMIT 10"
        )).mappings().all()
        
        vectors = []
        for row in result:
            vec_list = json.loads(row["vector_json"])
            vectors.append({
                "entry_id": row["entry_id"],
                "dimensions": len(vec_list),
                "snippet": vec_list[:5] # Show first 5 dimensions as a snippet
            })
            
        return {
            "total_count": len(vectors),
            "entries": vectors
        }
    except Exception as e:
        logger.error(f"Error fetching debug vectors: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reembed")
def reembed_entries(background_tasks: BackgroundTasks):
    """
    Re-embed all existing entries using the full user_log for improved RAG accuracy.
    Runs in the background so the request returns immediately.
    """
    from backend.services.reembed import reembed_all_entries

    logger.info("Re-embed: Triggered via API endpoint")
    background_tasks.add_task(reembed_all_entries)
    return {"status": "Re-embedding started in the background. Check logs for progress."}

