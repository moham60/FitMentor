"""
Workout and exercise data queries and mutations.
Handles workout routines, sessions, plans, exercises, and sets.
"""

from __future__ import annotations

from typing import Optional

from .base import (
    fetch_table,
    fetch_table_first,
    get_http_client,
    headers,
    supabase_post,
    supabase_patch,
    SUPABASE_URL,
    _first,
)


async def fetch_workouts(user_id: str, limit: int = 10) -> list[dict]:
    """Fetch user's workouts, most recent first."""
    return await fetch_table(
        "workouts",
        filters={"user_id": f"eq.{user_id}"},
        order="workout_date.desc",
        limit=limit,
    )


async def fetch_workout_sessions(user_id: str) -> list[dict]:
    """Fetch user's workout sessions, most recent first."""
    return await fetch_table(
        "user_workout_sessions",
        filters={"user_id": f"eq.{user_id}"},
        order="session_date.desc",
        limit=10,
    )


async def fetch_workout_routines(user_id: str, limit: int = 12) -> list[dict]:
    """Fetch user's saved workout routines."""
    return await fetch_table(
        "workout_routines",
        filters={"user_id": f"eq.{user_id}"},
        order="created_at.desc",
        limit=limit,
    )


async def fetch_workout_routine(routine_id: str) -> Optional[dict]:
    """Fetch a specific workout routine by ID."""
    return await fetch_table_first("workout_routines", filters={"id": f"eq.{routine_id}"})


async def fetch_workout_history(user_id: str, limit: int = 5) -> list[dict]:
    """Alias for fetch_workouts with smaller default limit."""
    return await fetch_workouts(user_id, limit=limit)


async def fetch_user_exercises(user_id: str, limit: int = 25) -> list[dict]:
    """Fetch user's custom exercises."""
    return await fetch_table(
        "exercises",
        filters={"user_id": f"eq.{user_id}"},
        order="created_at.desc",
        limit=limit,
    )


async def fetch_user_workout_sets(session_id: str, limit: int = 100) -> list[dict]:
    """Fetch all exercise sets from a workout session."""
    return await fetch_table(
        "user_exercise_sets",
        filters={"session_id": f"eq.{session_id}"},
        order="set_number.asc",
        limit=limit,
    )


async def fetch_workout_plans(limit: int = 10) -> list[dict]:
    """Fetch global workout plans."""
    return await fetch_table("workout_plans", order="created_at.desc", limit=limit)


async def fetch_workout_plan_days(plan_id: Optional[str] = None, limit: int = 50) -> list[dict]:
    """Fetch workout plan days, optionally filtered by plan ID."""
    filters = {"plan_id": f"eq.{plan_id}"} if plan_id else None
    return await fetch_table("workout_plan_days", filters=filters, order="day_number.asc", limit=limit)


async def fetch_workout_plan_exercises(plan_day_id: Optional[str] = None, limit: int = 100) -> list[dict]:
    """Fetch workout plan exercises, optionally filtered by plan day ID."""
    filters = {"plan_day_id": f"eq.{plan_day_id}"} if plan_day_id else None
    return await fetch_table("workout_plan_exercises", filters=filters, order="order_index.asc", limit=limit)


async def insert_workout_routine(routine_data: dict) -> Optional[dict]:
    """Create a new workout routine."""
    client = get_http_client()
    res = await client.post(
        f"{SUPABASE_URL}/rest/v1/workout_routines",
        headers=headers(),
        json=routine_data,
    )
    return _first(res) if res.status_code in (200, 201) else None


async def update_workout_routine_by_id(routine_id: str, updates: dict) -> Optional[dict]:
    """Update a workout routine by ID."""
    client = get_http_client()
    res = await client.patch(
        f"{SUPABASE_URL}/rest/v1/workout_routines?id=eq.{routine_id}",
        headers=headers(),
        json=updates,
    )
    return _first(res) if res.status_code == 200 else None


async def insert_user_workout_session(session_data: dict) -> Optional[dict]:
    """Create a new user workout session."""
    client = get_http_client()
    res = await client.post(
        f"{SUPABASE_URL}/rest/v1/user_workout_sessions",
        headers=headers(),
        json=session_data,
    )
    return _first(res) if res.status_code in (200, 201) else None


async def update_user_workout_session_by_id(session_id: str, updates: dict) -> Optional[dict]:
    """Update a user workout session by ID."""
    client = get_http_client()
    res = await client.patch(
        f"{SUPABASE_URL}/rest/v1/user_workout_sessions?id=eq.{session_id}",
        headers=headers(),
        json=updates,
    )
    return _first(res) if res.status_code == 200 else None
