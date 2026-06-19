"""
Context building and bulk data fetching.
Fetches comprehensive user context for AI chatbot from all available tables.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, Optional

from .base import fetch_table, DEFAULT_LIMIT
from . import user_service, workout_service, meal_service, social_service, coach_service

logger = logging.getLogger(__name__)

USER_TABLE_CONFIG: dict[str, dict[str, str]] = {
    "profiles": {"user_column": "user_id", "order": "created_at.desc", "limit": "1"},
    "body_measurements": {"user_column": "user_id", "order": "measurement_date.desc", "limit": "5"},
    "weight_logs": {"user_column": "user_id", "order": "log_date.desc", "limit": "10"},
    "inbody_results": {"user_column": "user_id", "order": "created_at.desc", "limit": "1000"},
    "workouts": {"user_column": "user_id", "order": "workout_date.desc", "limit": "10"},
    "exercises": {"user_column": "user_id", "order": "created_at.desc", "limit": "25"},
    "user_workout_sessions": {"user_column": "user_id", "order": "session_date.desc", "limit": "10"},
    "meals": {"user_column": "user_id", "order": "meal_date.desc", "limit": "10"},
    "user_meal_plans": {"user_column": "user_id", "order": "plan_date.desc", "limit": "5"},
    "posts": {"user_column": "user_id", "order": "created_at.desc", "limit": "10"},
    "post_comments": {"user_column": "user_id", "order": "created_at.desc", "limit": "10"},
    "post_likes": {"user_column": "user_id", "order": "created_at.desc", "limit": "10"},
}

GLOBAL_TABLE_CONFIG: dict[str, dict[str, str]] = {
    "exercise_library": {"order": "created_at.desc", "limit": "200"},
    "food_items": {"order": "created_at.desc", "limit": "200"},
    "workout_plans": {"order": "created_at.desc", "limit": str(DEFAULT_LIMIT)},
    "workout_plan_days": {"order": "day_number.asc", "limit": "50"},
    "workout_plan_exercises": {"order": "order_index.asc", "limit": "100"},
    "coach_plans": {"order": "created_at.desc", "limit": str(DEFAULT_LIMIT)},
    "plan_muscles": {"order": "order_index.asc", "limit": "100"},
}


async def fetch_all_user_tables(user_id: str) -> Dict[str, Any]:
    """
    Fetch readable user-scoped data from every table in the schema.

    Related tables without user_id are fetched from the user's latest linked
    meal plans, workout sessions, and coach plan.
    """

    async def safe_fetch(name: str, coro) -> tuple[str, Any]:
        try:
            return name, await coro
        except Exception as exc:
            logger.warning("[Supabase] Failed to fetch %s: %s", name, exc)
            return name, [] if name != "profiles" else None

    tasks = [
        safe_fetch(
            table,
            fetch_table(
                table,
                filters={config["user_column"]: f"eq.{user_id}"},
                order=config.get("order"),
                limit=config.get("limit", DEFAULT_LIMIT),
            ),
        )
        for table, config in USER_TABLE_CONFIG.items()
    ]
    tasks.extend([
        safe_fetch("direct_messages", social_service.fetch_direct_messages(user_id)),
        safe_fetch("user_follows", social_service.fetch_user_follows(user_id)),
    ])

    rows = dict(await asyncio.gather(*tasks))
    profile = rows.get("profiles")
    if isinstance(profile, list):
        rows["profiles"] = profile[0] if profile else None

    meal_plan_ids = [p.get("id") for p in rows.get("user_meal_plans", []) if p.get("id")]
    session_ids = [s.get("id") for s in rows.get("user_workout_sessions", []) if s.get("id")]
    coach_plan_id = rows.get("profiles", {}).get("coach_plan_id") if rows.get("profiles") else None

    related_tasks = []
    for meal_plan_id in meal_plan_ids[:3]:
        related_tasks.extend([
            safe_fetch(f"user_meal_items:{meal_plan_id}", meal_service.fetch_meal_items(meal_plan_id)),
            safe_fetch(f"user_meal_checkins:{meal_plan_id}", meal_service.fetch_user_meal_checkins(meal_plan_id)),
        ])
    for session_id in session_ids[:3]:
        related_tasks.append(
            safe_fetch(f"user_exercise_sets:{session_id}", workout_service.fetch_user_workout_sets(session_id))
        )
    if coach_plan_id:
        related_tasks.append(safe_fetch("selected_coach_plan", coach_service.fetch_coach_plan(coach_plan_id)))
        related_tasks.append(safe_fetch("selected_plan_muscles", coach_service.fetch_plan_muscles(coach_plan_id)))

    related = dict(await asyncio.gather(*related_tasks)) if related_tasks else {}
    rows["user_meal_items"] = [
        item for meal_plan_id in meal_plan_ids[:3]
        for item in related.get(f"user_meal_items:{meal_plan_id}", [])
    ]
    rows["user_meal_checkins"] = [
        item for meal_plan_id in meal_plan_ids[:3]
        for item in related.get(f"user_meal_checkins:{meal_plan_id}", [])
    ]
    rows["user_exercise_sets"] = [
        item for session_id in session_ids[:3]
        for item in related.get(f"user_exercise_sets:{session_id}", [])
    ]
    rows["selected_coach_plan"] = related.get("selected_coach_plan")
    rows["selected_plan_muscles"] = related.get("selected_plan_muscles", [])

    global_tasks = [
        safe_fetch(
            table,
            fetch_table(table, order=config.get("order"), limit=config.get("limit", DEFAULT_LIMIT)),
        )
        for table, config in GLOBAL_TABLE_CONFIG.items()
    ]
    rows.update(dict(await asyncio.gather(*global_tasks)))
    return rows


async def build_user_context(user_id: str) -> Dict[str, Any]:
    """Build comprehensive user context from all available data."""
    return await fetch_all_user_tables(user_id)
