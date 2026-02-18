from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from ..database import Base

class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_log = Column(String, nullable=False)
    emotion = Column(String, nullable=True)
    sentiment = Column(Float, nullable=True)
    # For sqlite-vec, embeddings are usually handled via virtual tables, 
    # but we can store the raw vector as a BLOB if needed, 
    # or just keep the metadata here. 
    # The user requested 'ai_summary' to be the vector embeddings.
    ai_summary = Column(String, nullable=True) # Placeholder for vector/metadata
    date = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
