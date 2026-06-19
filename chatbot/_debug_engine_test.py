import asyncio
import logging

logging.basicConfig(level=logging.INFO)

from router import route_query
from engine import get_rag_engine


async def main():
    routing = route_query('كيف أبدأ في تخفيف الدهون؟', user_id='demo')
    engine = get_rag_engine()
    result = await engine.generate('كيف أبدأ في تخفيف الدهون؟', routing, None)
    print(result.answer)


asyncio.run(main())
