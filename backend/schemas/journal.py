from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime
from typing import Optional, Literal, List

# Shared type definitions for consistency between agent extraction and API response
SentimentLiteral = Literal[1, 0, -1]
ModeLiteral = Literal["Work", "Personal", "Health", "Relationships", "Finance", "Hobbies", "Travel", "Education"]

class JournalEntryBase(BaseModel):
    user_log: str

class JournalEntryCreate(JournalEntryBase):
    model_name: Optional[str] = None  # User-selected Ollama model (e.g. "qwen3.5:4b")

class JournalEntryResponse(JournalEntryBase):
    """
    Standard response model for a journal entry, including AI-extracted metadata.
    """
    id: int
    date: datetime
    updated_at: datetime
    title: Optional[str] = None
    emotion: Optional[str] = None
    sentiment: Optional[SentimentLiteral] = None
    mode: Optional[ModeLiteral] = None
    summary: Optional[str] = None
    actionable_insight: Optional[str] = None
    tags: Optional[List[str]] = None
    pending: bool = False

    @field_validator('tags', mode='before')
    @classmethod
    def parse_tags(cls, v):
        if isinstance(v, str):
            return [tag.strip() for tag in v.split(',') if tag.strip()]
        return v

    model_config = ConfigDict(from_attributes=True)

class ExtractorResponse(BaseModel):
    """
    Model for the AI Agent's raw extraction output.
    """
    title: Optional[str] = None
    sentiment: Optional[SentimentLiteral] = None
    mode: Optional[ModeLiteral] = None
    emotion: Optional[str] = None
    summary: Optional[str] = None
    actionable_insight: Optional[str] = None
    tags: Optional[List[str]] = None
