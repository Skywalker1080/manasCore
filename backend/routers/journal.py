from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import JournalEntry
from ..schemas.journal import JournalEntryCreate, JournalEntryRead

router = APIRouter(prefix="/entries", tags=["journal"])

@router.post("/", response_model=JournalEntryRead, status_code=status.HTTP_201_CREATED)
def create_entry(entry: JournalEntryCreate, db: Session = Depends(get_db)):
    db_entry = JournalEntry(
        user_log=entry.user_log,
        emotion=entry.emotion,
        sentiment=entry.sentiment,
        ai_summary=entry.ai_summary,
        # 'date' will default to current UTC time in the model
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.get("/", response_model=List[JournalEntryRead])
def read_entries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(JournalEntry).order_by(JournalEntry.date.desc()).offset(skip).limit(limit).all()

@router.get("/{entry_id}", response_model=JournalEntryRead)
def read_entry(entry_id: int, db: Session = Depends(get_db)):
    db_entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if db_entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    return db_entry

@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    db_entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if db_entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(db_entry)
    db.commit()
    return None
