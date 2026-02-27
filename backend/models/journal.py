from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from datetime import datetime
from ..database import Base

class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.utcnow)
    user_log = Column(String, nullable=False)
    emotion = Column(String, nullable=True)
    sentiment = Column(Integer, nullable=True)
    mode = Column(String, nullable=True)
    summary = Column(String, nullable=True)
    actionable_insight = Column(String, nullable=True)
    tags = Column(String, nullable=True)
    pending = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
