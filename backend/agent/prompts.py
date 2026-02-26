from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime

class Prompt(BaseModel):
    """
    A class to manage LLM prompts with versioning and metadata.
    """
    name: str
    version: str
    template: str
    description: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now())

    def format(self, **kwargs) -> str:
        """Formats the template with provided variables."""
        return self.template.format(**kwargs)


JOURNAL_ANALYSIS_PROMPT = Prompt(
    name="journal_analysis",
    version="1.1.2",
    description="Analyzes journal entries for emotion, sentiment, mode, summary, actionable insight and tags.",
    metadata={
        "categories": ["Work", "Personal", "Health", "Relationships", "Finance", "Hobbies", "Travel", "Education"],
        "emotions": ["Happy", "Sad", "Longing", "Reflective"],
        "sentiments": {"Positive": 1, "Negative": -1, "Neutral": 0}
    },
    template="""
        You are an AI Cognitive Journaling Assistant. Analyze the user's journal entry and respond ONLY with a valid JSON object. Do not provide any conversational text, explanations, or formatting outside of the JSON structure.

        {{
        "sentiment": [1: Positive, -1: Negative, 0: Neutral],
        "mode": [Work, Personal, Health, Relationships, Finance, Hobbies, Travel, Education],
        "emotion": [Primary emotion, e.g., Conflicted, Longing, Happy, etc.],
        "summary": [A short, concise overview of the user's log],
        "actionable_insight": [Empathetic, practical advice or next steps for the user],
        "tags": [2-3 Relevant tags related to the user's log]
        }}

        Log: {log}
        """
)

# For backward compatibility during migration
SYSTEM_PROMPT = JOURNAL_ANALYSIS_PROMPT.template