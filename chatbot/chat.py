"""
Phase 6: /api/chat endpoint
Full hybrid RAG pipeline: route → retrieve → generate → respond.
"""

from __future__ import annotations

import logging
import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from context_builder import build_user_context
from engine import get_rag_engine
from router import RetrievalMode, route_query
from supabase import SUPABASE_URL, fetch_table, supabase_delete, supabase_patch, supabase_post

logger = logging.getLogger(__name__)
router = APIRouter()

_MEMORY_CONVERSATIONS: dict[str, dict] = {}
_MEMORY_MESSAGES: dict[str, list[dict]] = {}


class ChatRequest(BaseModel):
    query: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    user_profile: Optional[dict] = None
    stream: bool = False


class ConversationCreateRequest(BaseModel):
    user_id: str
    title: Optional[str] = None


class ConversationUpdateRequest(BaseModel):
    user_id: str
    title: Optional[str] = None


class MessageCreateRequest(BaseModel):
    user_id: str
    role: str
    content: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[str]
    routing_mode: str
    structured_context_used: bool
    vector_docs_used: int
    confidence: float
    follow_up_questions: list[str]
    session_id: Optional[str]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _memory_conversations(user_id: str) -> list[dict]:
    rows = [row for row in _MEMORY_CONVERSATIONS.values() if row.get("user_id") == user_id]
    return sorted(rows, key=lambda row: row.get("updated_at") or "", reverse=True)


@router.get("/conversations")
async def list_conversations(user_id: str = Query(...)):
    if SUPABASE_URL:
        rows = await fetch_table(
            "chatbot_conversations",
            filters={"user_id": f"eq.{user_id}"},
            order="updated_at.desc",
            limit=50,
        )
        if rows:
            return rows

    return _memory_conversations(user_id)


@router.post("/conversations")
async def create_conversation(req: ConversationCreateRequest):
    now = _now_iso()
    payload = {
        "id": str(uuid.uuid4()),
        "user_id": req.user_id,
        "title": req.title or "New chat",
        "created_at": now,
        "updated_at": now,
    }

    if SUPABASE_URL:
        res = await supabase_post("chatbot_conversations", payload)
        if res.status_code in {200, 201}:
            data = res.json()
            if isinstance(data, list) and data:
                return data[0]
        logger.warning("[ChatConversations] Supabase create failed: %s %s", res.status_code, res.text[:200])

    _MEMORY_CONVERSATIONS[payload["id"]] = payload
    _MEMORY_MESSAGES.setdefault(payload["id"], [])
    return payload


@router.patch("/conversations/{conversation_id}")
async def update_conversation(conversation_id: str, req: ConversationUpdateRequest):
    now = _now_iso()
    updates = {"updated_at": now}
    if req.title is not None:
        updates["title"] = req.title

    if SUPABASE_URL:
        res = await supabase_patch(
            "chatbot_conversations",
            filters={"id": f"eq.{conversation_id}", "user_id": f"eq.{req.user_id}"},
            payload=updates,
        )
        if res.status_code in {200, 204}:
            data = res.json() if res.text else []
            if isinstance(data, list) and data:
                return data[0]
        logger.warning("[ChatConversations] Supabase update failed: %s %s", res.status_code, res.text[:200])

    conversation = _MEMORY_CONVERSATIONS.get(conversation_id)
    if not conversation or conversation.get("user_id") != req.user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.update(updates)
    return conversation


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, user_id: str = Query(...)):
    if SUPABASE_URL:
        conversations = await fetch_table(
            "chatbot_conversations",
            filters={"id": f"eq.{conversation_id}", "user_id": f"eq.{user_id}"},
            limit=1,
        )
        if not conversations:
            raise HTTPException(status_code=404, detail="Conversation not found")

        await supabase_delete(
            "chatbot_messages",
            filters={"conversation_id": f"eq.{conversation_id}"},
        )
        res = await supabase_delete(
            "chatbot_conversations",
            filters={"id": f"eq.{conversation_id}", "user_id": f"eq.{user_id}"},
        )
        if res.status_code in {200, 204}:
            return {"deleted": True}
        logger.warning("[ChatConversations] Supabase delete failed: %s %s", res.status_code, res.text[:200])

    conversation = _MEMORY_CONVERSATIONS.get(conversation_id)
    if conversation and conversation.get("user_id") == user_id:
        _MEMORY_CONVERSATIONS.pop(conversation_id, None)
        _MEMORY_MESSAGES.pop(conversation_id, None)
        return {"deleted": True}

    raise HTTPException(status_code=404, detail="Conversation not found")


@router.get("/conversations/{conversation_id}/messages")
async def list_messages(conversation_id: str, user_id: str = Query(...)):
    if SUPABASE_URL:
        conversations = await fetch_table(
            "chatbot_conversations",
            filters={"id": f"eq.{conversation_id}", "user_id": f"eq.{user_id}"},
            limit=1,
        )
        if conversations:
            return await fetch_table(
                "chatbot_messages",
                filters={"conversation_id": f"eq.{conversation_id}"},
                order="created_at.asc",
                limit=100,
            )

    conversation = _MEMORY_CONVERSATIONS.get(conversation_id)
    if not conversation or conversation.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return _MEMORY_MESSAGES.get(conversation_id, [])


@router.post("/conversations/{conversation_id}/messages")
async def create_message(conversation_id: str, req: MessageCreateRequest):
    if req.role not in {"user", "assistant"}:
        raise HTTPException(status_code=422, detail="Role must be 'user' or 'assistant'")

    now = _now_iso()
    payload = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "role": req.role,
        "content": req.content,
        "created_at": now,
    }

    if SUPABASE_URL:
        conversations = await fetch_table(
            "chatbot_conversations",
            filters={"id": f"eq.{conversation_id}", "user_id": f"eq.{req.user_id}"},
            limit=1,
        )
        if conversations:
            res = await supabase_post("chatbot_messages", payload)
            if res.status_code in {200, 201}:
                await supabase_patch(
                    "chatbot_conversations",
                    filters={"id": f"eq.{conversation_id}", "user_id": f"eq.{req.user_id}"},
                    payload={"updated_at": now},
                )
                data = res.json()
                if isinstance(data, list) and data:
                    return data[0]
            logger.warning("[ChatMessages] Supabase create failed: %s %s", res.status_code, res.text[:200])

    conversation = _MEMORY_CONVERSATIONS.get(conversation_id)
    if not conversation or conversation.get("user_id") != req.user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    _MEMORY_MESSAGES.setdefault(conversation_id, []).append(payload)
    conversation["updated_at"] = now
    return payload


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
