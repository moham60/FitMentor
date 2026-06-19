import asyncio
import logging

logging.basicConfig(level=logging.INFO)

from router import route_query
from engine import get_rag_engine
from context_builder import build_user_context, build_recent_conversation_memory, build_persistent_user_memory


async def main():
    user_id = 'demo'
    routing = route_query('كيف أبدأ في تخفيف الدهون؟', user_id=user_id)
    engine = get_rag_engine()

    structured_ctx = await build_user_context(user_id)
    persistent_memory = await build_persistent_user_memory(user_id)
    conversation_history = await build_recent_conversation_memory(user_id)

    memory_parts = []
    profile_summary = structured_ctx.as_compact() if structured_ctx and structured_ctx.has_data else ""
    if profile_summary:
        memory_parts.append(f"Current profile: {profile_summary}")
    if persistent_memory:
        memory_parts.append(persistent_memory)
    if conversation_history:
        memory_parts.append(f"Recent conversation history:\n{conversation_history}")
    memory_snapshot = "\n\n".join(memory_parts) if memory_parts else "No known user memory available."

    result = await engine.generate(
        'كيف أبدأ في تخفيف الدهون؟',
        routing,
        structured_ctx=structured_ctx,
        user_id=user_id,
        conversation_history=conversation_history,
        persistent_memory=persistent_memory,
        memory_snapshot=memory_snapshot,
    )
    print(result.answer)


asyncio.run(main())
