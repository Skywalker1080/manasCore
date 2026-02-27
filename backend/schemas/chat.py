"""Pydantic schemas for the chat feature."""

from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime


class ChatMessageInput(BaseModel):
    """Incoming chat message from the user."""
    message: str
    history: list[dict] = []  # Previous messages: [{role, content}, ...]


class SourceEntry(BaseModel):
    """A journal entry referenced as a source in the AI's response."""
    entry_id: int
    summary: Optional[str] = None
    date: Optional[str] = None
    emotion: Optional[str] = None
    mode: Optional[str] = None


class ChatResponse(BaseModel):
    """Full (non-streaming) chat response."""
    message: str
    sources: list[SourceEntry] = []
