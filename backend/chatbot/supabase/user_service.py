"""
User profile and body measurement queries.
Handles user profile, body measurements, InBody results, and weight logs.
"""

from __future__ import annotations

from typing import Optional

from .base import fetch_table, fetch_table_first


async def fetch_profile(user_id: str) -> Optional[dict]:
    """Fetch user profile."""
    return await fetch_table_first("profiles", filters={"user_id": f"eq.{user_id}"})


async def fetch_user_profile(user_id: str) -> Optional[dict]:
    """Alias for fetch_profile for backward compatibility."""
    return await fetch_profile(user_id)


async def fetch_body_measurements(user_id: str) -> list[dict]:
    """Fetch user's body measurements, most recent first."""
    return await fetch_table(
        "body_measurements",
        filters={"user_id": f"eq.{user_id}"},
        order="measurement_date.desc",
        limit=5,
    )


async def fetch_inbody(user_id: str) -> Optional[dict]:
    """Fetch user's latest InBody scan (most recent body measurement)."""
    body_measurements = await fetch_body_measurements(user_id)
    return body_measurements[0] if body_measurements else None


async def fetch_inbody_results(user_id: str, limit: int = 1000) -> list[dict]:
    """Fetch user's InBody results history."""
    return await fetch_table(
        "inbody_results",
        filters={"user_id": f"eq.{user_id}"},
        order="created_at.desc",
        limit=limit,
    )


async def fetch_weight_logs(user_id: str) -> list[dict]:
    """Fetch user's weight logs, most recent first."""
    return await fetch_table(
        "weight_logs",
        filters={"user_id": f"eq.{user_id}"},
        order="log_date.desc",
        limit=10,
    )
