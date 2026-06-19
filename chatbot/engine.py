"""
Phase 4: LangChain-Powered Hybrid RAG Engine (OPTIMIZED)
With caching: embedding cache, vector search cache, full response cache.
Targets <1.5s response time.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
from dataclasses import asdict, dataclass, field
from typing import AsyncIterator

from langchain_cohere import ChatCohere
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser

from context_builder import StructuredContext
from vector_store import CohereEmbedder, VectorStoreManager
from router import RetrievalMode, RoutingDecision
from cache_layer import get_cache_manager, _cache_key_vector_search, _cache_key_rag_response, QUERY_CACHE_TTL, VECTOR_SEARCH_TTL

logger = logging.getLogger(__name__)


@dataclass
class RAGResult:
    """Final assembled context + generated answer from the hybrid pipeline."""
    answer: str
    sources: list[str]
    routing_mode: str
    structured_context_used: bool
    vector_docs_used: int
    confidence: float = 0.0
    follow_up_questions: list[str] = field(default_factory=list)


# ── LangChain Prompt Templates ─────────────────────────────────────────────────

SYSTEM_PROMPT = """You are FitMentor AI — a certified sports science and nutrition coach integrated into the FitMentor fitness platform.

Your role:
- Give personalized, evidence-based fitness and nutrition advice
- When the user's biometric data is available, always reference it explicitly
- Be direct, specific, and actionable — avoid vague generic advice
- Use a warm, motivating tone
- Respond in the same language as the user (Arabic or English)
- Never recommend dangerous practices or replace medical advice

Response format:
- Return clean, structured plain text. No markdown, no special formatting, no symbols.
- Use numbers (1. 2. 3.) for lists instead of • or -
- No ** ** for bold, no __ __ for underline
- Use plain text labels followed by colon for sections
- Include specific numbers (calories, sets, reps, etc.) based on user's data
- Use the user memory snapshot as authoritative history across chats and sessions
- Never ask the user to repeat details already present in the user memory snapshot
- If enough profile or memory data exists for a workout or meal plan, answer directly with a personalized plan and only mention assumptions if one or two fields are missing
- Keep responses focused and under 350 words unless a full plan is requested"""
SYSTEM_PROMPT = """You are FitMentor AI — a certified sports science and nutrition coach integrated into the FitMentor fitness platform.

Your role:
- Give personalized, evidence-based fitness and nutrition advice
- When the user's biometric data is available, always reference it explicitly
- Be direct, specific, and actionable — avoid vague generic advice
- Use a warm, motivating tone
- Respond in the same language as the user (Arabic or English)
- Never recommend dangerous practices or replace medical advice

Memory handling and safety (STRICT):
- Treat the provided `memory_snapshot` as the single authoritative record of prior user facts and prior conversation content for this request.
- Do NOT ask the user to repeat, confirm, or re-provide any detail that is present in the `memory_snapshot`.
- If the `memory_snapshot` contains conflicting or ambiguous details, do NOT ask the user to disambiguate; instead, state your most conservative assumption clearly (prefix with "Assumption:") and proceed with safe, conservative guidance.
- If an essential medical safety detail (e.g., insulin use, severe allergy) is missing from `memory_snapshot`, state that the recommendation is made without that detail and recommend the specific check the user should provide (do not repeatedly prompt during generation).

Response format:
- Return clean, structured plain text. No markdown, no special formatting, no symbols.
- Use numbers (1. 2. 3.) for lists instead of • or -
- No ** ** for bold, no __ __ for underline
- Use plain text labels followed by colon for sections
- Include specific numbers (calories, sets, reps, etc.) based on user's data
- Use the user memory snapshot as authoritative history across chats and sessions
- Never ask the user to repeat details already present in the user memory snapshot
- If enough profile or memory data exists for a workout or meal plan, answer directly with a personalized plan and only mention assumptions if one or two fields are missing
- Keep responses focused and under 350 words unless a full plan is requested"""

# Context assembly template
CONTEXT_TEMPLATE = """=== RETRIEVED CONTEXT ===

{context}

=== USER MEMORY SNAPSHOT ===

{memory_snapshot}

=== ROUTING METADATA ===
Mode: {routing_mode}
Intent: {intent}

=== USER QUESTION ===
{query}"""

# Full chat prompt (fixed: use from_template with input_variables)
chat_prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("user", CONTEXT_TEMPLATE),
])


def _format_context(
    structured_ctx: StructuredContext | None,
    vector_docs: list[dict],
    conversation_history: str | None = None,
) -> str:
    """Format retrieved context from structured + vector sources."""
    sections = []
    
    if structured_ctx and structured_ctx.has_data:
        sections.append(
            "USER PERSONAL DATA (Supabase):\n"
            + structured_ctx.as_full_context()
        )
    
    if vector_docs:
        docs_text = "\n\n".join(
            f"[{d.get('source', 'Knowledge Base')}]\n{d.get('text', '')}"
            for d in vector_docs[:4]
        )
        sections.append(f"RETRIEVED KNOWLEDGE:\n{docs_text}")
    
    return "\n\n".join(sections) if sections else "No additional context available"


def _clean_response(text: str) -> str:
    """
    Clean and format response text.
    Removes markdown symbols and extra whitespace.
    
    إزالة الرموز والفراغات الزائدة من الرد.
    """
    # إزالة الرموز: * # > - ` _
    text = re.sub(r"[*#>\`_]", "", text)
    # تقليل الفراغات المتعددة إلى سطر واحد
    text = re.sub(r"\n{2,}", "\n", text)
    # إزالة الفراغات الزائدة في البداية والنهاية
    return text.strip()


def _route_hint_from_query(query: str, metadata: list[dict]) -> str | None:
    """Detect a route mentioned directly or by readable slug in the user query."""
    q = query.lower()
    path_match = re.search(r"(^|\s)(/[a-z0-9][a-z0-9_/\-:]*)", q)
    if path_match:
        return path_match.group(2).rstrip("/") or "/"

    known_routes = sorted(
        {
            item.get("route")
            for item in metadata
            if isinstance(item.get("route"), str)
        },
        key=len,
        reverse=True,
    )
    for route in known_routes:
        readable = route.strip("/").replace("-", " ").replace("_", " ")
        if readable and readable in q:
            return route
    return None


def _prioritize_route_docs(docs: list[dict], route_hint: str | None, limit: int) -> list[dict]:
    if not route_hint:
        return docs[:limit]
    route_hint = route_hint.rstrip("/") or "/"
    matching = [
        doc for doc in docs
        if (doc.get("route", "").rstrip("/") or "/") == route_hint
    ]
    if not matching:
        return docs[:limit]
    remainder = [doc for doc in docs if doc not in matching]
    return (matching + remainder)[:limit]



# ── Main LangChain RAG Engine ──────────────────────────────────────────────────

class HybridRAGEngine:
    """
    LangChain-based Hybrid RAG Engine.
    Orchestrates: routing → retrieval → chain execution → response generation.
    """

    def __init__(self):
        api_key = os.getenv("COHERE_API_KEY", "")
        if not api_key:
            raise RuntimeError("COHERE_API_KEY is required")
        
        # Initialize LangChain components
        self.llm = ChatCohere(
            cohere_api_key=api_key,
            model=os.getenv("LLM_MODEL", "command-a-03-2025"),
            temperature=0.35,
            max_tokens=600,
        )
        
        # Initialize retrieval components
        self.embedder = CohereEmbedder(api_key=api_key)
        self.vector_store = VectorStoreManager.get_instance()
        
        # Build the chain (FIXED: format context in lambda, pass dict through)
        self.chain = (
            RunnablePassthrough.assign(
                context=RunnableLambda(self._get_formatted_context),
                routing_mode=RunnableLambda(lambda x: x["routing"].mode.value),
                intent=RunnableLambda(lambda x: x["routing"].intent),
                conversation_history=RunnableLambda(
                    lambda x: x.get("conversation_history") or "No prior conversation memory available."
                ),
                persistent_memory=RunnableLambda(
                    lambda x: x.get("persistent_memory") or "No persistent user memory available."
                ),
                memory_snapshot=RunnableLambda(
                    lambda x: x.get("memory_snapshot") or "No known user memory available."
                ),
            )
            | chat_prompt
            | self.llm
            | StrOutputParser()
        )
        
        logger.info("[HybridRAGEngine] Initialized with LangChain")

    def _get_formatted_context(self, input_dict: dict) -> str:
        """Format context from structured + vector sources."""
        return _format_context(
            input_dict.get("structured_ctx"),
            input_dict.get("vector_docs", []),
            input_dict.get("conversation_history"),
        )

    def _format_context_wrapper(self, input_dict: dict) -> str:
        """Wrapper for context formatting in the chain (deprecated, kept for reference)."""
        return _format_context(
            input_dict.get("structured_ctx"),
            input_dict.get("vector_docs", []),
        )

    async def generate(
        self,
        query: str,
        routing: RoutingDecision,
        structured_ctx: StructuredContext | None = None,
        user_id: str | None = None,
        conversation_history: str | None = None,
        persistent_memory: str | None = None,
        memory_snapshot: str | None = None,
    ) -> RAGResult:
        """
        Full LangChain RAG pipeline with caching (OPTIMIZED):
        1. Check cache for full response (2 min TTL)
        2. Retrieve from appropriate sources (with caching)
        3. Format context via LangChain
        4. Run LLM chain
        5. Cache result for future queries
        
        Performance targets:
        - Cached response: <100ms
        - First-time response: <1.5s
        """
        cache = get_cache_manager()
        cache_user_id = user_id or (structured_ctx.user_id if structured_ctx else None)
        response_cache_key = _cache_key_rag_response(query, cache_user_id)
        
        # ── PHASE 0: Check full response cache ──────────────────────────────────
        cached_response = await cache.get(response_cache_key)
        if cached_response:
            logger.debug(f"[RAGEngine] Response cache HIT")
            if isinstance(cached_response, RAGResult):
                return cached_response
            return RAGResult(**cached_response)

        logger.debug(f"[RAGEngine] Response cache MISS, running full pipeline...")
        
        vector_docs: list[dict] = []
        sources: list[str] = []

        # ── PHASE 1: Vector Retrieval (with caching) ───────────────────────────
        if routing.mode in (RetrievalMode.VECTOR_ONLY, RetrievalMode.HYBRID):
            if self.vector_store.size > 0:
                try:
                    # Use cached embedding method
                    query_vec = await self.embedder.embed_query_cached(query)
                    k = 5 if routing.mode == RetrievalMode.HYBRID else 7
                    route_hint = _route_hint_from_query(query, self.vector_store.metadata)
                    
                    # Cache vector search results by query hash
                    search_cache_key = _cache_key_vector_search(query)
                    cached_docs = await cache.get(search_cache_key)
                    
                    if cached_docs:
                        logger.debug(f"[RAGEngine] Vector search cache HIT")
                        vector_docs = _prioritize_route_docs(cached_docs, route_hint, k)
                    else:
                        logger.debug(f"[RAGEngine] Vector search cache MISS, querying FAISS...")
                        search_k = min(max(k * 4, 20), self.vector_store.size)
                        raw_docs = self.vector_store.search(query_vec, k=search_k)
                        vector_docs = _prioritize_route_docs(raw_docs, route_hint, k)
                        await cache.set(search_cache_key, raw_docs, VECTOR_SEARCH_TTL)
                    
                    sources = list(set(d.get("source", "") for d in vector_docs if d.get("source")))
                    logger.info(f"[RAGEngine] Vector retrieved {len(vector_docs)} docs (cached={cached_docs is not None})")
                    
                except Exception as e:
                    logger.warning(f"[RAGEngine] Vector search failed: {e}")

        if routing.mode == RetrievalMode.SUPABASE_ONLY:
            sources = ["Supabase User Data"]

        if routing.mode == RetrievalMode.HYBRID and structured_ctx:
            sources.append("Supabase User Data")

        # ── PHASE 2: Merge & Rank ─────────────────────────────────────────────
        if routing.mode == RetrievalMode.HYBRID:
            vector_docs = vector_docs[:3]

        # ── PHASE 3: LLM Generation via LangChain ──────────────────────────────
        try:
            answer = await self.chain.ainvoke({
                "query": query,
                "routing": routing,
                "structured_ctx": structured_ctx,
                "vector_docs": vector_docs,
                "conversation_history": conversation_history,
                "persistent_memory": persistent_memory,
                "memory_snapshot": memory_snapshot,
            })
        except Exception as e:
            logger.error(f"[RAGEngine] LLM chain failed: {e}")
            answer = self._fallback_answer(routing)

        # ── PHASE 4: Clean response ────────────────────────────────────────────
        answer = _clean_response(answer)

        result = RAGResult(
            answer=answer,
            sources=list(set(sources)),
            routing_mode=routing.mode.value,
            structured_context_used=bool(structured_ctx and structured_ctx.has_data),
            vector_docs_used=len(vector_docs),
            confidence=routing.confidence,
            follow_up_questions=self._generate_followups(routing.intent),
        )

        # ── PHASE 4: Cache the result ──────────────────────────────────────────
        await cache.set(response_cache_key, asdict(result), QUERY_CACHE_TTL)
        logger.debug(f"[RAGEngine] Cached response with TTL={QUERY_CACHE_TTL}s")

        return result

    async def stream_generate(
        self,
        query: str,
        routing: RoutingDecision,
        structured_ctx: StructuredContext | None = None,
        user_id: str | None = None,
        conversation_history: str | None = None,
        persistent_memory: str | None = None,
        memory_snapshot: str | None = None,
    ) -> AsyncIterator[dict]:
        """
        Stream generated answer chunks and finish with response metadata.
        Yields dict events with type="chunk", type="done", or type="error".
        """
        cache = get_cache_manager()
        cache_user_id = user_id or (structured_ctx.user_id if structured_ctx else None)
        response_cache_key = _cache_key_rag_response(query, cache_user_id)

        cached_response = await cache.get(response_cache_key)
        if cached_response:
            logger.debug("[RAGEngine] Response cache HIT")
            result = cached_response if isinstance(cached_response, RAGResult) else RAGResult(**cached_response)
            if result.answer:
                yield {"type": "chunk", "content": result.answer}
            yield {"type": "done", **asdict(result)}
            return

        logger.debug("[RAGEngine] Response cache MISS, running streaming pipeline...")

        vector_docs: list[dict] = []
        sources: list[str] = []

        if routing.mode in (RetrievalMode.VECTOR_ONLY, RetrievalMode.HYBRID):
            if self.vector_store.size > 0:
                try:
                    query_vec = await self.embedder.embed_query_cached(query)
                    k = 5 if routing.mode == RetrievalMode.HYBRID else 7
                    route_hint = _route_hint_from_query(query, self.vector_store.metadata)

                    search_cache_key = _cache_key_vector_search(query)
                    cached_docs = await cache.get(search_cache_key)

                    if cached_docs:
                        logger.debug("[RAGEngine] Vector search cache HIT")
                        vector_docs = _prioritize_route_docs(cached_docs, route_hint, k)
                    else:
                        logger.debug("[RAGEngine] Vector search cache MISS, querying FAISS...")
                        search_k = min(max(k * 4, 20), self.vector_store.size)
                        raw_docs = self.vector_store.search(query_vec, k=search_k)
                        vector_docs = _prioritize_route_docs(raw_docs, route_hint, k)
                        await cache.set(search_cache_key, raw_docs, VECTOR_SEARCH_TTL)

                    sources = list(set(d.get("source", "") for d in vector_docs if d.get("source")))
                    logger.info(
                        "[RAGEngine] Vector retrieved %s docs (cached=%s)",
                        len(vector_docs),
                        cached_docs is not None,
                    )

                except Exception as e:
                    logger.warning(f"[RAGEngine] Vector search failed: {e}")

        if routing.mode == RetrievalMode.SUPABASE_ONLY:
            sources = ["Supabase User Data"]

        if routing.mode == RetrievalMode.HYBRID and structured_ctx:
            sources.append("Supabase User Data")
            vector_docs = vector_docs[:3]

        payload = {
            "query": query,
            "routing": routing,
            "structured_ctx": structured_ctx,
            "vector_docs": vector_docs,
            "conversation_history": conversation_history,
            "persistent_memory": persistent_memory,
            "memory_snapshot": memory_snapshot,
        }

        answer_parts: list[str] = []
        try:
            async for chunk in self.chain.astream(payload):
                if not chunk:
                    continue
                answer_parts.append(chunk)
                yield {"type": "chunk", "content": chunk}

            answer = _clean_response("".join(answer_parts))
        except Exception as e:
            logger.error(f"[RAGEngine] Streaming LLM chain failed: {e}")
            answer = self._fallback_answer(routing)
            yield {"type": "chunk", "content": answer}
            yield {"type": "error", "message": "LLM stream failed; returned fallback answer."}

        result = RAGResult(
            answer=answer,
            sources=list(set(sources)),
            routing_mode=routing.mode.value,
            structured_context_used=bool(structured_ctx and structured_ctx.has_data),
            vector_docs_used=len(vector_docs),
            confidence=routing.confidence,
            follow_up_questions=self._generate_followups(routing.intent),
        )

        await cache.set(response_cache_key, asdict(result), QUERY_CACHE_TTL)
        logger.debug(f"[RAGEngine] Cached streamed response with TTL={QUERY_CACHE_TTL}s")

        yield {"type": "done", **asdict(result)}

    def _fallback_answer(self, routing: RoutingDecision) -> str:
        """Graceful fallback if LLM chain fails."""
        return (
            "I'm having trouble generating a response right now. "
            "Please try again in a moment, or rephrase your question."
        )

    def _generate_followups(self, intent: str) -> list[str]:
        """Generate contextual follow-up question suggestions."""
        followups = {
            "personal": [
                "Would you like a personalized meal plan based on your InBody data?",
                "Do you want to see your progress over the last 4 weeks?",
            ],
            "knowledge": [
                "Would you like this advice tailored to your specific body composition?",
                "Do you have any dietary restrictions I should consider?",
            ],
            "personalized_knowledge": [
                "Shall I create a full weekly workout schedule for you?",
                "Would you like a nutrition breakdown with macros?",
            ],
            "general": [
                "What's your current fitness goal?",
                "Would you like to connect your InBody data for personalized advice?",
            ],
        }
        return followups.get(intent, followups["general"])


# ── Singleton ──────────────────────────────────────────────────────────────────
_engine: HybridRAGEngine | None = None


def get_rag_engine() -> HybridRAGEngine:
    global _engine
    if _engine is None:
        _engine = HybridRAGEngine()
    return _engine
