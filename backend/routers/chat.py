"""
Chat router: streaming and non-streaming endpoints for AI chat.
"""

from __future__ import annotations

import json
import time

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.agent.llm_client import get_completion_stream
from backend.agent.prompts import ENTRY_CHAT_SYSTEM_PROMPT
from backend.database import get_db
from backend.schemas.chat import (
    ChatMessageInput,
    ChatResponse,
    EntryContextChatInput,
    SourceEntry,
)
from backend.services.chat import ChatService
from backend.services.profile import ProfileService
from backend.services.rag_observability import finalize_trace, save_retrieval, start_trace
from logger.logger import get_logger

router = APIRouter(prefix="/chat", tags=["chat"])
logger = get_logger()


@router.post("/", response_model=ChatResponse)
def chat(request: ChatMessageInput, db: Session = Depends(get_db)):
    started = time.perf_counter()
    trace_id = start_trace(
        db=db,
        query=request.message,
        history_len=len(request.history),
        requested_model=request.model_name,
    )

    messages, source_entries, retrieval_debug = ChatService.build_messages(
        user_message=request.message,
        chat_history=request.history,
        db=db,
    )
    save_retrieval(db, trace_id, retrieval_debug, source_entries)

    full_response = ""
    first_token_ms = None
    stream_started = time.perf_counter()
    error_text = None
    try:
        for chunk in get_completion_stream(messages, model_name=request.model_name):
            if first_token_ms is None and chunk:
                first_token_ms = (time.perf_counter() - stream_started) * 1000.0
            full_response += chunk
    except Exception as exc:
        error_text = str(exc)
        logger.error(f"Non-stream chat failed: {exc}")

    llm_total_ms = (time.perf_counter() - stream_started) * 1000.0
    total_ms = (time.perf_counter() - started) * 1000.0
    finalize_trace(
        db=db,
        trace_id=trace_id,
        answer_text=full_response,
        llm_first_token_ms=first_token_ms,
        llm_total_ms=llm_total_ms,
        total_ms=total_ms,
        error_text=error_text,
    )

    sources = [
        SourceEntry(
            entry_id=e["entry_id"],
            summary=e.get("summary"),
            date=e.get("date"),
            emotion=e.get("emotion"),
            mode=e.get("mode"),
            distance=e.get("distance"),
            retrieval_method=e.get("retrieval_method"),
        )
        for e in source_entries
    ]
    return ChatResponse(message=full_response, sources=sources, trace_id=trace_id)


@router.post("/stream")
def chat_stream(request: ChatMessageInput, db: Session = Depends(get_db)):
    started = time.perf_counter()
    trace_id = start_trace(
        db=db,
        query=request.message,
        history_len=len(request.history),
        requested_model=request.model_name,
    )

    messages, source_entries, retrieval_debug = ChatService.build_messages(
        user_message=request.message,
        chat_history=request.history,
        db=db,
    )
    save_retrieval(db, trace_id, retrieval_debug, source_entries)

    def event_generator():
        full_response = ""
        first_token_ms = None
        error_text = None
        stream_started = time.perf_counter()
        try:
            for chunk in get_completion_stream(messages, model_name=request.model_name):
                if first_token_ms is None and chunk:
                    first_token_ms = (time.perf_counter() - stream_started) * 1000.0
                full_response += chunk
                event_data = json.dumps({"type": "token", "content": chunk})
                yield f"data: {event_data}\n\n"

            sources = [
                {
                    "entry_id": e["entry_id"],
                    "summary": e.get("summary"),
                    "date": e.get("date"),
                    "emotion": e.get("emotion"),
                    "mode": e.get("mode"),
                    "distance": e.get("distance"),
                    "retrieval_method": e.get("retrieval_method"),
                }
                for e in source_entries
            ]
            sources_data = json.dumps({"type": "sources", "sources": sources, "trace_id": trace_id})
            yield f"data: {sources_data}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as exc:
            error_text = str(exc)
            logger.error(f"Streaming error: {exc}")
            error_data = json.dumps({"type": "error", "content": str(exc)})
            yield f"data: {error_data}\n\n"
        finally:
            llm_total_ms = (time.perf_counter() - stream_started) * 1000.0
            total_ms = (time.perf_counter() - started) * 1000.0
            finalize_trace(
                db=db,
                trace_id=trace_id,
                answer_text=full_response,
                llm_first_token_ms=first_token_ms,
                llm_total_ms=llm_total_ms,
                total_ms=total_ms,
                error_text=error_text,
            )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/entry/stream")
def chat_entry_stream(request: EntryContextChatInput):
    try:
        personality = ProfileService.get_profile_content("personality")
    except Exception:
        personality = "No personality defined yet."

    system_content = ENTRY_CHAT_SYSTEM_PROMPT.format(
        personality=personality,
        entry_log=request.entry_log,
        entry_summary=request.entry_summary or "No summary available.",
        entry_insight=request.entry_insight or "No actionable insight available.",
        entry_sentiment=str(request.entry_sentiment) if request.entry_sentiment is not None else "Not analyzed",
        entry_emotion=request.entry_emotion or "Not detected",
        entry_mode=request.entry_mode or "Not categorized",
    )

    messages = [{"role": "system", "content": system_content}]
    for msg in request.history[-20:]:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
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
