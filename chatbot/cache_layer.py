"""
Cache Layer: Production-grade in-memory caching with TTL support.
Optional Redis integration for distributed caching.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import time
from dataclasses import dataclass
from typing import Any, Generic, Optional, TypeVar, Callable, Awaitable

logger = logging.getLogger(__name__)

T = TypeVar("T")

# ── Configuration ──────────────────────────────────────────────────────────────

CACHE_REDIS_URL = os.getenv("REDIS_URL", "")  # Optional: redis://localhost:6379/0
USE_REDIS = bool(CACHE_REDIS_URL)

# TTL (Time-to-Live) in seconds
USER_CONTEXT_TTL = int(os.getenv("CACHE_USER_CONTEXT_TTL", 300))      # 5 minutes
QUERY_CACHE_TTL = int(os.getenv("CACHE_QUERY_TTL", 120))              # 2 minutes
EMBEDDING_CACHE_TTL = int(os.getenv("CACHE_EMBEDDING_TTL", 3600))     # 1 hour
VECTOR_SEARCH_TTL = int(os.getenv("CACHE_VECTOR_SEARCH_TTL", 120))    # 2 minutes


@dataclass
class CacheEntry(Generic[T]):
    """Generic cache entry with TTL tracking."""
    key: str
    value: T
    created_at: float
    ttl: int

    def is_expired(self) -> bool:
        return (time.time() - self.created_at) > self.ttl

    def get(self) -> T | None:
        if self.is_expired():
            return None
        return self.value


class InMemoryCache(Generic[T]):
    """
    Thread-safe in-memory cache with automatic TTL expiration.
    Suitable for single-instance deployments.
    """

    def __init__(self):
        self.store: dict[str, CacheEntry] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> T | None:
        """Retrieve value if not expired."""
        async with self._lock:
            entry = self.store.get(key)
            if entry is None:
                return None
            if entry.is_expired():
                del self.store[key]
                return None
            return entry.value

    async def set(self, key: str, value: T, ttl: int) -> None:
        """Store value with TTL."""
        async with self._lock:
            self.store[key] = CacheEntry(key=key, value=value, created_at=time.time(), ttl=ttl)

    async def delete(self, key: str) -> None:
        """Delete a cache entry."""
        async with self._lock:
            self.store.pop(key, None)

    async def clear(self) -> None:
        """Clear all cache entries."""
        async with self._lock:
            self.store.clear()

    async def cleanup_expired(self) -> None:
        """Periodically clean up expired entries."""
        async with self._lock:
            expired_keys = [k for k, v in self.store.items() if v.is_expired()]
            for key in expired_keys:
                del self.store[key]
            if expired_keys:
                logger.debug(f"[Cache] Cleaned up {len(expired_keys)} expired entries")

    def size(self) -> int:
        """Return current cache size."""
        return len(self.store)


class CacheManager:
    """
    Unified cache manager supporting both in-memory and Redis backends.
    Falls back to in-memory if Redis is unavailable.
    """

    def __init__(self):
        self.redis_client = None
        self.in_memory: InMemoryCache = InMemoryCache()
        self._use_redis = False

        if USE_REDIS:
            try:
                import redis.asyncio as redis

                self.redis_client = redis.from_url(CACHE_REDIS_URL, decode_responses=True)
                self._use_redis = True
                logger.info(f"[CacheManager] Using Redis: {CACHE_REDIS_URL}")
            except Exception as e:
                logger.warning(f"[CacheManager] Redis unavailable ({e}), falling back to in-memory")
                self._use_redis = False

    async def get(self, key: str) -> Any:
        """Retrieve value from cache (tries Redis first, then in-memory)."""
        if self._use_redis:
            try:
                value = await self.redis_client.get(key)
                if value:
                    import json
                    return json.loads(value)
            except Exception as e:
                logger.warning(f"[CacheManager] Redis get failed: {e}")

        return await self.in_memory.get(key)

    async def set(self, key: str, value: Any, ttl: int) -> None:
        """Store value in cache (writes to both Redis and in-memory)."""
        # Always use in-memory
        await self.in_memory.set(key, value, ttl)

        # Try Redis if available
        if self._use_redis:
            try:
                import json
                await self.redis_client.setex(key, ttl, json.dumps(value))
            except Exception as e:
                logger.warning(f"[CacheManager] Redis set failed: {e}")

    async def delete(self, key: str) -> None:
        """Delete entry from both caches."""
        await self.in_memory.delete(key)
        if self._use_redis:
            try:
                await self.redis_client.delete(key)
            except Exception as e:
                logger.warning(f"[CacheManager] Redis delete failed: {e}")

    async def invalidate_pattern(self, pattern: str) -> None:
        """Invalidate all keys matching pattern (useful for user_id wildcards)."""
        in_memory_pattern = pattern.replace("*", "")
        async with self.in_memory._lock:
            keys_to_delete = [k for k in self.in_memory.store.keys() if in_memory_pattern in k]
            for key in keys_to_delete:
                del self.in_memory.store[key]

        if self._use_redis:
            try:
                redis_pattern = pattern if "*" in pattern else f"*{pattern}*"
                keys = await self.redis_client.keys(redis_pattern)
                if keys:
                    await self.redis_client.delete(*keys)
            except Exception as e:
                logger.warning(f"[CacheManager] Redis pattern delete failed: {e}")

    async def clear(self) -> None:
        """Clear all cache entries."""
        await self.in_memory.clear()
        if self._use_redis:
            try:
                await self.redis_client.flushdb()
            except Exception as e:
                logger.warning(f"[CacheManager] Redis clear failed: {e}")


# ── Singleton ──────────────────────────────────────────────────────────────────

_cache_manager: Optional[CacheManager] = None


def get_cache_manager() -> CacheManager:
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager()
    return _cache_manager


# ── Utility Functions ──────────────────────────────────────────────────────────

def _hash_key(text: str) -> str:
    """Generate consistent hash key for strings (query, embedding)."""
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def _cache_key_user_context(user_id: str) -> str:
    """Generate cache key for user context."""
    return f"ctx:user:{user_id}"


def _cache_key_vector_search(query: str) -> str:
    """Generate cache key for vector search results."""
    return f"vec:search:{_hash_key(query)}"


def _cache_key_embedding(text: str) -> str:
    """Generate cache key for embeddings."""
    return f"emb:{_hash_key(text)}"


def _cache_key_rag_response(query: str, user_id: str | None = None) -> str:
    """Generate cache key for full RAG responses."""
    suffix = f":{user_id}" if user_id else ""
    return f"rag:response:{_hash_key(query)}{suffix}"


def _cache_key_workout_routine(routine_id: str) -> str:
    """Generate cache key for workout routine."""
    return f"workout:routine:{routine_id}"


def _cache_key_workout_routines_index(user_id: str) -> str:
    """Generate cache key for user's workout routines index."""
    return f"workout:index:{user_id}"


# ── Caching Decorators ─────────────────────────────────────────────────────────

def cached(ttl: int):
    """
    Async decorator for caching function results.

    Usage:
        @cached(ttl=300)
        async def expensive_function(key: str):
            return await fetch_data(key)
    """

    def decorator(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        async def wrapper(*args, **kwargs) -> T:
            # Generate cache key from function name + args
            cache_key = f"func:{func.__name__}:{_hash_key(str(args) + str(kwargs))}"
            cache = get_cache_manager()

            # Try cache first
            cached_result = await cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"[Cache] HIT: {cache_key}")
                return cached_result

            # Execute function
            result = await func(*args, **kwargs)

            # Store in cache
            await cache.set(cache_key, result, ttl)
            logger.debug(f"[Cache] MISS: {cache_key} (stored with TTL={ttl}s)")

            return result

        return wrapper

    return decorator
