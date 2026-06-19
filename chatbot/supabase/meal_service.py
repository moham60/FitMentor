"""
Meal and nutrition data queries.
Handles meal plans, meals, food items, and meal check-ins.
"""

from __future__ import annotations

from typing import Optional

from .base import fetch_table, fetch_table_first, LIBRARY_LIMIT


async def fetch_meals(user_id: str, limit: int = 10) -> list[dict]:
    """Fetch user's meals, most recent first."""
    return await fetch_table(
        "meals",
        filters={"user_id": f"eq.{user_id}"},
        order="meal_date.desc",
        limit=limit,
    )


async def fetch_meal_plans(user_id: str) -> list[dict]:
    """Fetch user's meal plans."""
    return await fetch_table(
        "user_meal_plans",
        filters={"user_id": f"eq.{user_id}"},
        order="plan_date.desc",
        limit=5,
    )


async def fetch_meal_items(meal_plan_id: str) -> list[dict]:
    """Fetch items in a meal plan."""
    return await fetch_table(
        "user_meal_items",
        filters={"meal_plan_id": f"eq.{meal_plan_id}"},
        order="created_at.asc",
        limit=50,
    )


async def fetch_user_meal_checkins(meal_plan_id: str, limit: int = 30) -> list[dict]:
    """Fetch meal check-ins for a meal plan."""
    return await fetch_table(
        "user_meal_checkins",
        filters={"meal_plan_id": f"eq.{meal_plan_id}"},
        order="checked_at.desc",
        limit=limit,
    )


async def fetch_food_items() -> list[dict]:
    """Fetch global food library."""
    return await fetch_table("food_items", limit=LIBRARY_LIMIT)


async def fetch_food_item(food_item_id: str) -> Optional[dict]:
    """Fetch a specific food item by ID."""
    return await fetch_table_first("food_items", filters={"id": f"eq.{food_item_id}"})
