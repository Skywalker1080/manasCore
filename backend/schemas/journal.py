from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class JournalEntryBase(BaseModel):
    user_log: str
    emotion: Optional[str] = None
    sentiment: Optional[float] = None
    ai_summary: Optional[str] = None # For now, a string representation of the vector

class JournalEntryCreate(JournalEntryBase):
    pass

class JournalEntryRead(JournalEntryBase):
    id: int
    date: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
