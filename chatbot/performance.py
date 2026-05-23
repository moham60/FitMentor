"""
Performance Monitoring Module
Track cache hits, latency, and system health.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Awaitable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CacheSource(str, Enum):
    """Where the response came from."""
    CACHE_HIT = "cache_hit"           # Full response from cache
    CACHE_MISS = "cache_miss"         # Fresh computation
    EMBEDDING_CACHE = "embedding_cache"
    VECTOR_CACHE = "vector_cache"
    SUPABASE_CACHED = "supabase_cached"


@dataclass
class PerformanceMetrics:
    """Track performance metrics for each request."""
    query: str
    user_id: str | None
    routing_mode: str
    
    # Timing (ms)
    total_time: float = 0.0
    embedding_time: float = 0.0
    vector_search_time: float = 0.0
    supabase_time: float = 0.0
    llm_time: float = 0.0
    
    # Cache metrics
    cache_sources: list[CacheSource] = field(default_factory=list)
    cache_hits: int = 0
    cache_misses: int = 0
    
    # Quality metrics
    answer_tokens: int = 0
    confidence: float = 0.0
    
    def __str__(self) -> str:
        cache_summary = f"hits={self.cache_hits}, misses={self.cache_misses}"
        return (
            f"[{self.routing_mode}] "
            f"Total={self.total_time:.0f}ms "
            f"(emb={self.embedding_time:.0f}ms, "
            f"vec={self.vector_search_time:.0f}ms, "
            f"db={self.supabase_time:.0f}ms, "
            f"llm={self.llm_time:.0f}ms) "
            f"Cache: {cache_summary}"
        )
    
    def is_fast_path(self) -> bool:
        """Returns True if response was under 1.5s (optimized target)."""
        return self.total_time < 1500
    
    def cache_efficiency(self) -> float:
        """Returns cache hit ratio (0.0 to 1.0)."""
        total = self.cache_hits + self.cache_misses
        return self.cache_hits / total if total > 0 else 0.0


class PerformanceTracker:
    """
    Tracks system performance and cache effectiveness.
    
    Usage:
        tracker = PerformanceTracker()
        
        async with tracker.measure("embedding") as timer:
            embedding = await embedder.embed(query)
        
        metrics = tracker.get_summary()
        print(metrics)
    """
    
    def __init__(self):
        self.timings: dict[str, float] = {}
        self.start_time = time.time()
        self.cache_hits = 0
        self.cache_misses = 0
        self.total_requests = 0
        
    async def time_operation(
        self,
        name: str,
        coro: Callable[..., Awaitable[T]],
        *args,
        **kwargs
    ) -> T:
        """Time an async operation and return result."""
        start = time.time()
        result = await coro(*args, **kwargs)
        elapsed = (time.time() - start) * 1000  # ms
        self.timings[name] = self.timings.get(name, 0) + elapsed
        logger.debug(f"[Performance] {name}: {elapsed:.0f}ms")
        return result
    
    def record_cache_hit(self):
        """Record a cache hit."""
        self.cache_hits += 1
    
    def record_cache_miss(self):
        """Record a cache miss."""
        self.cache_misses += 1
    
    def get_summary(self) -> dict:
        """Get performance summary."""
        total = self.cache_hits + self.cache_misses
        hit_ratio = self.cache_hits / total if total > 0 else 0
        
        return {
            "total_requests": self.total_requests,
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "cache_hit_ratio": hit_ratio,
            "average_times": {
                k: v / max(1, self.total_requests)
                for k, v in self.timings.items()
            },
        }


# ── Global Metrics Collector ───────────────────────────────────────────────────

_global_metrics: list[PerformanceMetrics] = []


def record_metrics(metrics: PerformanceMetrics) -> None:
    """Record request metrics globally."""
    _global_metrics.append(metrics)
    if len(_global_metrics) > 10000:  # Keep last 10k requests
        _global_metrics.pop(0)


def get_performance_report() -> dict:
    """Get aggregated performance report."""
    if not _global_metrics:
        return {"message": "No metrics recorded yet"}
    
    total_time_sum = sum(m.total_time for m in _global_metrics)
    avg_total_time = total_time_sum / len(_global_metrics)
    
    fast_paths = sum(1 for m in _global_metrics if m.is_fast_path())
    fast_path_ratio = fast_paths / len(_global_metrics)
    
    avg_embedding = sum(m.embedding_time for m in _global_metrics) / len(_global_metrics)
    avg_vector = sum(m.vector_search_time for m in _global_metrics) / len(_global_metrics)
    avg_supabase = sum(m.supabase_time for m in _global_metrics) / len(_global_metrics)
    avg_llm = sum(m.llm_time for m in _global_metrics) / len(_global_metrics)
    
    return {
        "total_requests": len(_global_metrics),
        "average_total_time_ms": avg_total_time,
        "target_met_ratio": fast_path_ratio,
        "breakdown_ms": {
            "embedding": avg_embedding,
            "vector_search": avg_vector,
            "supabase": avg_supabase,
            "llm": avg_llm,
        },
        "latest_10_requests": [
            {
                "query": m.query[:50],
                "user_id": m.user_id,
                "routing": m.routing_mode,
                "total_ms": m.total_time,
                "cache_hits": m.cache_hits,
            }
            for m in _global_metrics[-10:]
        ],
    }


def reset_metrics() -> None:
    """Clear all recorded metrics."""
    global _global_metrics
    _global_metrics = []
    logger.info("[Performance] Metrics cleared")
