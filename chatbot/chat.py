"""
Phase 6: /api/chat endpoint
Full hybrid RAG pipeline: route → retrieve → generate → respond.
"""

from __future__ import annotations

import logging
import json
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from context_builder import build_persistent_user_memory, build_recent_conversation_memory, build_user_context
from engine import get_rag_engine
from router import RetrievalMode, route_query
from supabase_client import fetch_table, fetch_table_first, supabase_delete, supabase_patch, supabase_post

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    query: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    conversation_id: Optional[str] = None
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


class ConversationCreateRequest(BaseModel):
    user_id: str
    title: str = "New chat"


class ConversationUpdateRequest(BaseModel):
    user_id: str
    title: Optional[str] = None


class MessageCreateRequest(BaseModel):
    user_id: str
    role: str
    content: str


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _json_rows(res) -> list[dict]:
    if res.status_code not in (200, 201, 204):
        logger.warning("[ChatHistory] Supabase %s: %s", res.status_code, res.text[:300])
        raise HTTPException(status_code=502, detail="Chat history database request failed")

    if res.status_code == 204 or not res.text:
        return []

    data = res.json()
    return data if isinstance(data, list) else [data]


async def _require_owned_conversation(conversation_id: str, user_id: str) -> dict:
    conversation = await fetch_table_first(
        "chatbot_conversations",
        filters={"id": f"eq.{conversation_id}", "user_id": f"eq.{user_id}"},
        select="id,user_id,title,created_at,updated_at",
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.get("/conversations")
async def list_conversations(user_id: str = Query(...)):
    return await fetch_table(
        "chatbot_conversations",
        filters={"user_id": f"eq.{user_id}"},
        select="id,user_id,title,created_at,updated_at",
        order="updated_at.desc",
        limit=100,
    )


@router.post("/conversations")
async def create_conversation(req: ConversationCreateRequest):
    title = (req.title or "New chat").strip() or "New chat"
    now = _utc_now()
    res = await supabase_post(
        "chatbot_conversations",
        {
            "user_id": req.user_id,
            "title": title,
            "created_at": now,
            "updated_at": now,
        },
        params={"select": "id,user_id,title,created_at,updated_at"},
    )
    rows = _json_rows(res)
    return rows[0] if rows else None


@router.patch("/conversations/{conversation_id}")
async def update_conversation(conversation_id: str, req: ConversationUpdateRequest):
    await _require_owned_conversation(conversation_id, req.user_id)

    updates = {"updated_at": _utc_now()}
    if req.title is not None:
        updates["title"] = (req.title.strip() or "New chat")

    res = await supabase_patch(
        "chatbot_conversations",
        filters={"id": f"eq.{conversation_id}", "user_id": f"eq.{req.user_id}"},
        payload=updates,
        params={"select": "id,user_id,title,created_at,updated_at"},
    )
    rows = _json_rows(res)
    return rows[0] if rows else None


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, user_id: str = Query(...)):
    await _require_owned_conversation(conversation_id, user_id)
    await supabase_delete("chatbot_messages", filters={"conversation_id": f"eq.{conversation_id}"})
    res = await supabase_delete(
        "chatbot_conversations",
        filters={"id": f"eq.{conversation_id}", "user_id": f"eq.{user_id}"},
    )
    _json_rows(res)
    return {"deleted": True}


@router.get("/conversations/{conversation_id}/messages")
async def list_messages(conversation_id: str, user_id: str = Query(...)):
    await _require_owned_conversation(conversation_id, user_id)
    return await fetch_table(
        "chatbot_messages",
        filters={"conversation_id": f"eq.{conversation_id}"},
        select="id,conversation_id,role,content,created_at",
        order="created_at.asc",
        limit=100,
    )


@router.post("/conversations/{conversation_id}/messages")
async def create_message(conversation_id: str, req: MessageCreateRequest):
    await _require_owned_conversation(conversation_id, req.user_id)

    if req.role not in {"user", "assistant"}:
        raise HTTPException(status_code=400, detail="Invalid message role")

    content = req.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    existing = await fetch_table(
        "chatbot_messages",
        filters={"conversation_id": f"eq.{conversation_id}"},
        select="id",
        order="created_at.asc",
        limit=11,
    )
    if len(existing) >= 10:
        raise HTTPException(status_code=400, detail="This conversation has reached the 10-message limit")

    res = await supabase_post(
        "chatbot_messages",
        {"conversation_id": conversation_id, "role": req.role, "content": content},
        params={"select": "id,conversation_id,role,content,created_at"},
    )
    rows = _json_rows(res)
    return rows[0] if rows else None


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
    conversation_history = None
    persistent_memory = None
    memory_snapshot = None
    if req.user_id:
        conversation_history = await build_recent_conversation_memory(req.user_id, req.conversation_id, query)
        persistent_memory = await build_persistent_user_memory(req.user_id, query)
    if routing.mode in (RetrievalMode.SUPABASE_ONLY, RetrievalMode.HYBRID):
        # Prefer server-side Supabase fetch when user_id is available
        if req.user_id:
            structured_ctx = await build_user_context(req.user_id)

        profile_summary = structured_ctx.as_compact() if structured_ctx and structured_ctx.has_data else ""
        memory_parts = []
        if profile_summary:
            memory_parts.append(f"Current profile: {profile_summary}")
        if persistent_memory:
            memory_parts.append(persistent_memory)
        if conversation_history:
            memory_parts.append(f"Recent conversation history:\n{conversation_history}")
        memory_snapshot = "\n\n".join(memory_parts) if memory_parts else "No known user memory available."

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
                    conversation_history=conversation_history,
                    persistent_memory=persistent_memory,
                    memory_snapshot=memory_snapshot,
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
        conversation_history=conversation_history,
        persistent_memory=persistent_memory,
        memory_snapshot=memory_snapshot,
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
