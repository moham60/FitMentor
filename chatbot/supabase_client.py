from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_TIMEOUT = float(os.getenv("SUPABASE_TIMEOUT_SECONDS", "8"))

logger = logging.getLogger(__name__)
_http_client: httpx.AsyncClient | None = None

DEFAULT_LIMIT = int(os.getenv("SUPABASE_DEFAULT_LIMIT", "10"))
LIBRARY_LIMIT = int(os.getenv("SUPABASE_LIBRARY_LIMIT", "200"))


USER_TABLE_CONFIG: dict[str, dict[str, str]] = {
    "profiles": {"user_column": "user_id", "order": "created_at.desc", "limit": "1"},
    "body_measurements": {"user_column": "user_id", "order": "measurement_date.desc", "limit": "5"},
    "weight_logs": {"user_column": "user_id", "order": "log_date.desc", "limit": "10"},
    "inbody_results": {"user_column": "user_id", "order": "created_at.desc", "limit": "3"},
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
    "exercise_library": {"order": "created_at.desc", "limit": str(LIBRARY_LIMIT)},
    "food_items": {"order": "created_at.desc", "limit": str(LIBRARY_LIMIT)},
    "workout_plans": {"order": "created_at.desc", "limit": str(DEFAULT_LIMIT)},
    "workout_plan_days": {"order": "day_number.asc", "limit": "50"},
    "workout_plan_exercises": {"order": "order_index.asc", "limit": "100"},
    "coach_plans": {"order": "created_at.desc", "limit": str(DEFAULT_LIMIT)},
    "plan_muscles": {"order": "order_index.asc", "limit": "100"},
}


def headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


def get_http_client() -> httpx.AsyncClient:
    """Reuse connections across Supabase requests instead of reconnecting per table."""
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(SUPABASE_TIMEOUT, connect=3.0),
            limits=httpx.Limits(max_connections=30, max_keepalive_connections=15),
        )
    return _http_client


async def close_http_client() -> None:
    global _http_client
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None


async def supabase_get(table: str, params: dict[str, str]) -> httpx.Response:
    client = get_http_client()
    return await client.get(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=headers(),
        params=params,
    )


async def fetch_table(
    table: str,
    *,
    filters: Optional[dict[str, str]] = None,
    select: str = "*",
    order: Optional[str] = None,
    limit: Optional[int | str] = DEFAULT_LIMIT,
) -> list[dict]:
    """Generic safe reader for any Supabase REST table."""
    params: dict[str, str] = {"select": select}
    if filters:
        params.update(filters)
    if order:
        params["order"] = order
    if limit is not None:
        params["limit"] = str(limit)

    res = await supabase_get(table, params)
    return _json_list(res)


async def fetch_table_first(
    table: str,
    *,
    filters: Optional[dict[str, str]] = None,
    select: str = "*",
    order: Optional[str] = None,
) -> Optional[dict]:
    rows = await fetch_table(table, filters=filters, select=select, order=order, limit=1)
    return rows[0] if rows else None


def _json_list(res: httpx.Response) -> list[dict]:
    if res.status_code != 200:
        logger.warning("[Supabase] %s %s", res.status_code, res.text[:200])
        return []
    try:
        data = res.json()
    except Exception:
        logger.warning("[Supabase] Invalid JSON response")
        return []
    return data if isinstance(data, list) else []


def _first(res: httpx.Response) -> Optional[dict]:
    data = _json_list(res)
    return data[0] if data else None


async def fetch_profile(user_id: str) -> Optional[dict]:
    return await fetch_table_first("profiles", filters={"user_id": f"eq.{user_id}"})


async def fetch_body_measurements(user_id: str) -> list[dict]:
    return await fetch_table(
        "body_measurements",
        filters={"user_id": f"eq.{user_id}"},
        order="measurement_date.desc",
        limit=5,
    )


async def fetch_weight_logs(user_id: str) -> list[dict]:
    return await fetch_table(
        "weight_logs",
        filters={"user_id": f"eq.{user_id}"},
        order="log_date.desc",
        limit=10,
    )


async def fetch_workouts(user_id: str, limit: int = 10) -> list[dict]:
    return await fetch_table(
        "workouts",
        filters={"user_id": f"eq.{user_id}"},
        order="workout_date.desc",
        limit=limit,
    )


async def fetch_workout_sessions(user_id: str) -> list[dict]:
    return await fetch_table(
        "user_workout_sessions",
        filters={"user_id": f"eq.{user_id}"},
        order="session_date.desc",
        limit=10,
    )


async def fetch_meals(user_id: str, limit: int = 10) -> list[dict]:
    return await fetch_table(
        "meals",
        filters={"user_id": f"eq.{user_id}"},
        order="meal_date.desc",
        limit=limit,
    )


async def fetch_meal_plans(user_id: str) -> list[dict]:
    return await fetch_table(
        "user_meal_plans",
        filters={"user_id": f"eq.{user_id}"},
        order="plan_date.desc",
        limit=5,
    )


async def fetch_exercise_library() -> list[dict]:
    return await fetch_table("exercise_library", limit=LIBRARY_LIMIT)


async def fetch_food_items() -> list[dict]:
    return await fetch_table("food_items", limit=LIBRARY_LIMIT)


async def fetch_user_profile(user_id: str) -> Optional[dict]:
    return await fetch_profile(user_id)


async def fetch_inbody(user_id: str) -> Optional[dict]:
    body_measurements = await fetch_body_measurements(user_id)
    return body_measurements[0] if body_measurements else None


async def fetch_inbody_results(user_id: str, limit: int = 3) -> list[dict]:
    return await fetch_table(
        "inbody_results",
        filters={"user_id": f"eq.{user_id}"},
        order="created_at.desc",
        limit=limit,
    )


async def fetch_workout_history(user_id: str, limit: int = 5) -> list[dict]:
    return await fetch_workouts(user_id, limit=limit)


async def fetch_coach_plan(plan_id: str) -> Optional[dict]:
    return await fetch_table_first("coach_plans", filters={"id": f"eq.{plan_id}"})


async def fetch_plan_muscles(plan_id: str) -> list[dict]:
    return await fetch_table(
        "plan_muscles",
        filters={"plan_id": f"eq.{plan_id}"},
        order="order_index.asc",
        limit=100,
    )


async def fetch_meal_items(meal_plan_id: str) -> list[dict]:
    return await fetch_table(
        "user_meal_items",
        filters={"meal_plan_id": f"eq.{meal_plan_id}"},
        order="created_at.asc",
        limit=50,
    )


async def fetch_food_item(food_item_id: str) -> Optional[dict]:
    return await fetch_table_first("food_items", filters={"id": f"eq.{food_item_id}"})


async def fetch_user_exercises(user_id: str, limit: int = 25) -> list[dict]:
    return await fetch_table(
        "exercises",
        filters={"user_id": f"eq.{user_id}"},
        order="created_at.desc",
        limit=limit,
    )


async def fetch_user_workout_sets(session_id: str, limit: int = 100) -> list[dict]:
    return await fetch_table(
        "user_exercise_sets",
        filters={"session_id": f"eq.{session_id}"},
        order="set_number.asc",
        limit=limit,
    )


async def fetch_user_meal_checkins(meal_plan_id: str, limit: int = 30) -> list[dict]:
    return await fetch_table(
        "user_meal_checkins",
        filters={"meal_plan_id": f"eq.{meal_plan_id}"},
        order="checked_at.desc",
        limit=limit,
    )


async def fetch_direct_messages(user_id: str, limit: int = 20) -> list[dict]:
    return await fetch_table(
        "direct_messages",
        filters={"or": f"(sender_id.eq.{user_id},receiver_id.eq.{user_id})"},
        order="created_at.desc",
        limit=limit,
    )


async def fetch_user_follows(user_id: str, limit: int = 50) -> list[dict]:
    return await fetch_table(
        "user_follows",
        filters={"or": f"(follower_id.eq.{user_id},following_id.eq.{user_id})"},
        order="created_at.desc",
        limit=limit,
    )


async def fetch_user_posts(user_id: str, limit: int = 10) -> list[dict]:
    return await fetch_table(
        "posts",
        filters={"user_id": f"eq.{user_id}"},
        order="created_at.desc",
        limit=limit,
    )


async def fetch_user_post_comments(user_id: str, limit: int = 10) -> list[dict]:
    return await fetch_table(
        "post_comments",
        filters={"user_id": f"eq.{user_id}"},
        order="created_at.desc",
        limit=limit,
    )


async def fetch_user_post_likes(user_id: str, limit: int = 10) -> list[dict]:
    return await fetch_table(
        "post_likes",
        filters={"user_id": f"eq.{user_id}"},
        order="created_at.desc",
        limit=limit,
    )


async def fetch_workout_plans(limit: int = DEFAULT_LIMIT) -> list[dict]:
    return await fetch_table("workout_plans", order="created_at.desc", limit=limit)


async def fetch_workout_plan_days(plan_id: Optional[str] = None, limit: int = 50) -> list[dict]:
    filters = {"plan_id": f"eq.{plan_id}"} if plan_id else None
    return await fetch_table("workout_plan_days", filters=filters, order="day_number.asc", limit=limit)


async def fetch_workout_plan_exercises(plan_day_id: Optional[str] = None, limit: int = 100) -> list[dict]:
    filters = {"plan_day_id": f"eq.{plan_day_id}"} if plan_day_id else None
    return await fetch_table("workout_plan_exercises", filters=filters, order="order_index.asc", limit=limit)


async def fetch_all_user_tables(user_id: str) -> Dict[str, Any]:
    """
    Fetch readable user-scoped data from every table in the schema.

    Related tables without user_id are fetched from the user's latest linked
    meal plans, workout sessions, and coach plan.
    """
    import asyncio

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
        safe_fetch("direct_messages", fetch_direct_messages(user_id)),
        safe_fetch("user_follows", fetch_user_follows(user_id)),
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
            safe_fetch(f"user_meal_items:{meal_plan_id}", fetch_meal_items(meal_plan_id)),
            safe_fetch(f"user_meal_checkins:{meal_plan_id}", fetch_user_meal_checkins(meal_plan_id)),
        ])
    for session_id in session_ids[:3]:
        related_tasks.append(
            safe_fetch(f"user_exercise_sets:{session_id}", fetch_user_workout_sets(session_id))
        )
    if coach_plan_id:
        related_tasks.append(safe_fetch("selected_coach_plan", fetch_coach_plan(coach_plan_id)))
        related_tasks.append(safe_fetch("selected_plan_muscles", fetch_plan_muscles(coach_plan_id)))

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
    return await fetch_all_user_tables(user_id)
