"""
Library data queries.
Handles global exercise library and related reference data.
"""

from __future__ import annotations

from .base import fetch_table, LIBRARY_LIMIT


async def fetch_exercise_library() -> list[dict]:
    """Fetch global exercise library."""
    return await fetch_table("exercise_library", limit=LIBRARY_LIMIT)
