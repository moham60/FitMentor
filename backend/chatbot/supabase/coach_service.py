"""
Coach plan data queries.
Handles coach plans and their associated muscle groups.
"""

from __future__ import annotations

from typing import Optional

from .base import fetch_table, fetch_table_first


async def fetch_coach_plan(plan_id: str) -> Optional[dict]:
    """Fetch a coach plan by ID."""
    return await fetch_table_first("coach_plans", filters={"id": f"eq.{plan_id}"})


async def fetch_plan_muscles(plan_id: str) -> list[dict]:
    """Fetch muscle groups for a coach plan."""
    return await fetch_table(
        "plan_muscles",
        filters={"plan_id": f"eq.{plan_id}"},
        order="order_index.asc",
        limit=100,
    )
