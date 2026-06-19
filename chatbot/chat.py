"""
Phase 6: /api/chat endpoint
Full hybrid RAG pipeline: route → retrieve → generate → respond.
"""

from __future__ import annotations

import logging
import json
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from context_builder import build_user_context
from engine import get_rag_engine
from router import RetrievalMode, route_query

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    query: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    user_profile: Optional[dict] = None
    stream: bool = False


class ChatResponse(BaseModel):
    answer: str
    sources: list[str]
    routing_mode: str
    structured_context_used: bool
    vector_docs_used: int
    confidence: float
    follow_up_questions: list[str]
    session_id: Optional[str]


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest):
    query = req.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    logger.info(f"[/chat] user_id={req.user_id} query={query[:80]}")

    # ── Phase 5: Route ─────────────────────────────────────────────────────────
    routing = route_query(query, user_id=req.user_id)
    logger.info(f"[/chat] Routing: {routing.mode.value} (confidence={routing.confidence:.2f})")

    if routing.mode == RetrievalMode.OFF_TOPIC:
        off_topic_response = ChatResponse(
            answer=(
                "I'm specialized in fitness, nutrition, and health topics. "
                "Feel free to ask me about workouts, diet plans, body composition, "
                "or how to use FitMentor!"
            ),
            sources=[],
            routing_mode=routing.mode.value,
            structured_context_used=False,
            vector_docs_used=0,
            confidence=routing.confidence,
            follow_up_questions=["What's your current fitness goal?", "Need help with a workout plan?"],
            session_id=req.session_id,
        )
        if req.stream:
            async def off_topic_events():
                yield _sse({"type": "chunk", "content": off_topic_response.answer})
                yield _sse({"type": "done", **off_topic_response.dict()})

            return StreamingResponse(off_topic_events(), media_type="text/event-stream")

        return ChatResponse(
            **off_topic_response.dict()
        )

    # ── Phase 2: Supabase Context ──────────────────────────────────────────────
    structured_ctx = None
    if routing.mode in (RetrievalMode.SUPABASE_ONLY, RetrievalMode.HYBRID):
        # Prefer server-side Supabase fetch when user_id is available
        if req.user_id:
            structured_ctx = await build_user_context(req.user_id)

        # Fallback 1: no user_id provided
        if (not structured_ctx) and req.user_profile:
            from context_builder import build_context_from_profile

            structured_ctx = await build_context_from_profile(req.user_profile, user_id=req.user_id)

        # Fallback 2: user_id exists but Supabase has no rows yet
        if structured_ctx and (not structured_ctx.has_data) and req.user_profile:
            from context_builder import build_context_from_profile

            structured_ctx = await build_context_from_profile(req.user_profile, user_id=req.user_id)

    # ── Phase 4: Hybrid RAG Engine ─────────────────────────────────────────────
    engine = get_rag_engine()
    if req.stream:
        async def stream_events():
            try:
                async for event in engine.stream_generate(
                    query=query,
                    routing=routing,
                    structured_ctx=structured_ctx,
                    user_id=req.user_id,
                ):
                    if event.get("type") == "done":
                        event = {**event, "session_id": req.session_id}
                    yield _sse(event)
            except Exception as e:
                logger.exception("[/chat] Streaming response failed")
                yield _sse({"type": "error", "message": str(e)})

        return StreamingResponse(
            stream_events(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    result = await engine.generate(
        query=query,
        routing=routing,
        structured_ctx=structured_ctx,
        user_id=req.user_id,
    )

    return ChatResponse(
        answer=result.answer,
        sources=result.sources,
        routing_mode=result.routing_mode,
        structured_context_used=result.structured_context_used,
        vector_docs_used=result.vector_docs_used,
        confidence=result.confidence,
        follow_up_questions=result.follow_up_questions,
        session_id=req.session_id,
    )


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
