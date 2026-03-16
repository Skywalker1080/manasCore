"""
Chat router — SSE streaming + non-streaming endpoints for AI chat.

POST /chat/        — full response (non-streaming fallback)
POST /chat/stream  — Server-Sent Events for token-by-token streaming
POST /chat/entry/stream — SSE streaming for entry-specific chat
"""

import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.chat import ChatMessageInput, ChatResponse, SourceEntry, EntryContextChatInput
from backend.services.chat import ChatService
from backend.agent.llm_client import get_completion_stream
from backend.agent.prompts import ENTRY_CHAT_SYSTEM_PROMPT
from backend.services.profile import ProfileService
from logger.logger import get_logger

router = APIRouter(prefix="/chat", tags=["chat"])
logger = get_logger()


@router.post("/", response_model=ChatResponse)
def chat(request: ChatMessageInput, db: Session = Depends(get_db)):
    """Non-streaming chat endpoint. Returns the full response at once."""
    logger.info(f"Chat request (non-streaming): '{request.message[:60]}...'")

    # Build messages with RAG context
    messages, source_entries = ChatService.build_messages(
        user_message=request.message,
        chat_history=request.history,
        db=db,
    )

    # Collect full response from streaming generator
    full_response = ""
    for chunk in get_completion_stream(messages, model_name=request.model_name):
        full_response += chunk

    # Build source citations
    sources = [
        SourceEntry(
            entry_id=e["entry_id"],
            summary=e.get("summary"),
            date=e.get("date"),
            emotion=e.get("emotion"),
            mode=e.get("mode"),
        )
        for e in source_entries
    ]

    return ChatResponse(message=full_response, sources=sources)


@router.post("/stream")
def chat_stream(request: ChatMessageInput, db: Session = Depends(get_db)):
    """
    SSE streaming chat endpoint.

    Sends events in the format:
      data: {"type": "token", "content": "..."}\n\n
      data: {"type": "sources", "sources": [...]}\n\n
      data: {"type": "done"}\n\n
    """
    logger.info(f"Chat request (streaming): '{request.message[:60]}...'")

    # Build messages with RAG context (done eagerly before streaming)
    messages, source_entries = ChatService.build_messages(
        user_message=request.message,
        chat_history=request.history,
        db=db,
    )

    def event_generator():
        """Yields SSE events as the LLM generates tokens."""
        try:
            # Stream tokens
            for chunk in get_completion_stream(messages, model_name=request.model_name):
                event_data = json.dumps({"type": "token", "content": chunk})
                yield f"data: {event_data}\n\n"

            # Send source citations after streaming completes
            sources = [
                {
                    "entry_id": e["entry_id"],
                    "summary": e.get("summary"),
                    "date": e.get("date"),
                    "emotion": e.get("emotion"),
                    "mode": e.get("mode"),
                }
                for e in source_entries
            ]
            sources_data = json.dumps({"type": "sources", "sources": sources})
            yield f"data: {sources_data}\n\n"

            # Signal completion
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            error_data = json.dumps({"type": "error", "content": str(e)})
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@router.post("/entry/stream")
def chat_entry_stream(request: EntryContextChatInput):
    """
    SSE streaming chat endpoint for a specific journal entry.

    Uses a dedicated system prompt populated with the entry's full context
    (log, summary, insight, sentiment, emotion, mode) and the AI personality.
    No RAG search needed — the context is provided directly.
    """
    logger.info(f"Entry chat request (streaming): '{request.message[:60]}...'")

    # Load AI personality
    try:
        personality = ProfileService.get_profile_content("personality")
    except Exception:
        personality = "No personality defined yet."

    # Build the entry-specific system prompt
    system_content = ENTRY_CHAT_SYSTEM_PROMPT.format(
        personality=personality,
        entry_log=request.entry_log,
        entry_summary=request.entry_summary or "No summary available.",
        entry_insight=request.entry_insight or "No actionable insight available.",
        entry_sentiment=str(request.entry_sentiment) if request.entry_sentiment is not None else "Not analyzed",
        entry_emotion=request.entry_emotion or "Not detected",
        entry_mode=request.entry_mode or "Not categorized",
    )

    # Compose message list
    messages = [{"role": "system", "content": system_content}]

    # Add conversation history
    for msg in request.history[-20:]:
        messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", ""),
        })

    # Add current user message
    messages.append({"role": "user", "content": request.message})

    def event_generator():
        try:
            for chunk in get_completion_stream(messages, model_name=request.model_name):
                event_data = json.dumps({"type": "token", "content": chunk})
                yield f"data: {event_data}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logger.error(f"Entry chat streaming error: {e}")
            error_data = json.dumps({"type": "error", "content": str(e)})
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
