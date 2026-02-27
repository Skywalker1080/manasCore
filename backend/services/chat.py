"""
Chat service — RAG pipeline for contextual AI conversations.

Embeds the user's question, searches the vector DB for similar journal entries,
loads profile context (personality, vision, goals), and generates an aligned response.
"""

from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.agent.llm_client import get_embeddings, get_completion_stream
from backend.agent.prompts import CHAT_SYSTEM_PROMPT
from backend.services.profile import ProfileService
from backend.utils import serialize_embedding
from logger.logger import get_logger

logger = get_logger()


class ChatService:
    """Handles the full RAG pipeline for the chat feature."""

    @staticmethod
    def search_similar_entries(
        query: str, db: Session, top_k: int = 5
    ) -> list[dict]:
        """
        Embed the user's query and find the most semantically similar
        journal entries using the vec_entries virtual table.

        Returns a list of dicts with entry_id, user_log, summary, date, distance.
        """
        try:
            logger.info(f"Embedding query for similarity search: '{query[:60]}...'")
            query_embedding = get_embeddings(query)
            serialized = serialize_embedding(query_embedding)

            results = db.execute(
                text(
                    """
                    SELECT
                        v.entry_id,
                        v.distance,
                        j.user_log,
                        j.summary,
                        j.emotion,
                        j.mode,
                        j.date
                    FROM vec_entries v
                    JOIN journal_entries j ON j.id = v.entry_id
                    WHERE embedding MATCH :query
                      AND k = :k
                    ORDER BY v.distance
                    """
                ),
                {"query": serialized, "k": top_k},
            ).mappings().all()

            entries = [
                {
                    "entry_id": row["entry_id"],
                    "user_log": row["user_log"],
                    "summary": row["summary"],
                    "emotion": row["emotion"],
                    "mode": row["mode"],
                    "date": str(row["date"]),
                    "distance": row["distance"],
                }
                for row in results
            ]

            logger.info(f"Found {len(entries)} similar entries for query")
            return entries

        except Exception as e:
            logger.warning(f"Similarity search failed: {e}")
            return []

    @staticmethod
    def load_profile_context() -> dict[str, str]:
        """Load all three profile documents (personality, vision, goals)."""
        profiles = {}
        for name in ["personality", "vision", "goals"]:
            try:
                profiles[name] = ProfileService.get_profile_content(name)
            except Exception as e:
                logger.warning(f"Could not load profile '{name}': {e}")
                profiles[name] = f"No {name} profile defined yet."
        return profiles

    @staticmethod
    def build_journal_context(entries: list[dict]) -> str:
        """Format retrieved journal entries into a context block for the LLM."""
        if not entries:
            return "No relevant journal entries found yet. The user is just getting started."

        lines = []
        for i, entry in enumerate(entries, 1):
            date = entry["date"][:10] if entry["date"] else "Unknown date"
            summary = entry.get("summary") or entry.get("user_log", "")[:200]
            emotion = entry.get("emotion", "Unknown")
            mode = entry.get("mode", "Unknown")
            lines.append(
                f"[Entry {i} — {date}] (Emotion: {emotion}, Mode: {mode})\n{summary}"
            )

        return "\n\n".join(lines)

    @classmethod
    def build_messages(
        cls,
        user_message: str,
        chat_history: list[dict],
        db: Session,
    ) -> tuple[list[dict], list[dict]]:
        """
        Build the full message list for the LLM, including:
        - System prompt with profile context + RAG results
        - Previous chat history
        - Current user message

        Returns (messages, source_entries) where source_entries are the
        RAG results for citation.
        """
        # 1. RAG — find similar journal entries
        similar_entries = cls.search_similar_entries(user_message, db)

        # 2. Load profile docs
        profiles = cls.load_profile_context()

        # 3. Build contextual journal block
        journal_context = cls.build_journal_context(similar_entries)

        # 4. Format system prompt
        system_content = CHAT_SYSTEM_PROMPT.format(
            personality=profiles["personality"],
            vision=profiles["vision"],
            goals=profiles["goals"],
            journal_context=journal_context,
        )

        # 5. Compose message list
        messages = [{"role": "system", "content": system_content}]

        # Add conversation history (keep last 10 exchanges to fit context window)
        for msg in chat_history[-20:]:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
            })

        # Add current user message
        messages.append({"role": "user", "content": user_message})

        return messages, similar_entries
