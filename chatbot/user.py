"""Phase 6: /api/user endpoints — fetch and display user data from Supabase."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from context_builder import build_user_context
from supabase_client import (
    fetch_coach_plan,
    fetch_meal_plans,
    fetch_meal_items,
    fetch_meals,
    fetch_inbody,
    fetch_user_profile,
    fetch_workout_history,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{user_id}/profiles")
async def get_profile(user_id: str):
    """Return raw user profile from Supabase."""
    profile = await fetch_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    return profile


@router.get("/{user_id}/inbody")
async def get_inbody(user_id: str):
    """Return latest InBody scan for user."""
    inbody = await fetch_inbody(user_id)
    if not inbody:
        raise HTTPException(status_code=404, detail="No InBody scan found")
    return inbody


@router.get("/{user_id}/meal-plans")
async def get_meal_plans(user_id: str):
    """Return meal plans for user."""
    meal_plans = await fetch_meal_plans(user_id)
    return {"user_id": user_id, "meal_plans": meal_plans}


@router.get("/{user_id}/meals")
async def get_meals(user_id: str, limit: int = 10):
    """Return meal logs for user."""
    meals = await fetch_meals(user_id, limit=limit)
    return {"user_id": user_id, "meals": meals}


@router.get("/{user_id}/coach-plan")
async def get_coach_plan(user_id: str):
    """Return the coach plan linked to the user's profile."""
    profile = await fetch_user_profile(user_id)
    if not profile or not profile.get("coach_plan_id"):
        return {"user_id": user_id, "coach_plan": None}

    coach_plan = await fetch_coach_plan(profile["coach_plan_id"])
    return {"user_id": user_id, "coach_plan": coach_plan}


@router.get("/{user_id}/goals")
async def get_goals(user_id: str):
    """Backward-compatible alias for meal plans."""
    meal_plans = await fetch_meal_plans(user_id)
    return {"user_id": user_id, "goals": meal_plans}


@router.get("/{user_id}/workouts")
async def get_workouts(user_id: str, limit: int = 10):
    """Return recent workout history."""
    workouts = await fetch_workout_history(user_id, limit=limit)
    return {"user_id": user_id, "workouts": workouts}


@router.get("/{user_id}/meal-items/{meal_plan_id}")
async def get_meal_items(user_id: str, meal_plan_id: str):
    """Return items for a specific meal plan."""
    meal_items = await fetch_meal_items(meal_plan_id)
    return {"user_id": user_id, "meal_plan_id": meal_plan_id, "meal_items": meal_items}


@router.get("/{user_id}/context")
async def get_user_context(user_id: str):
    """
    Return the fully formatted Supabase context block.
    Useful for debugging the Context Builder output.
    """
    ctx = await build_user_context(user_id)
    return {
        "user_id": user_id,
        "has_data": ctx.has_data,
        "full_context": ctx.as_full_context(),
        "compact_summary": ctx.as_compact(),
        "sections": {
            "profile": ctx.profile_block,
            "inbody": ctx.inbody_block,
            "inbody_results": ctx.inbody_results_block,
            "coach_plan": ctx.coach_plan_block,
            "workout_plans": ctx.workout_plans_block,
            "meal_plans": ctx.meal_plans_block,
            "meal_items": ctx.meal_items_block,
            "meal_checkins": ctx.meal_checkins_block,
            "meals": ctx.meals_block,
            "workouts": ctx.workouts_block,
            "workout_sessions": ctx.workout_sessions_block,
            "exercise_sets": ctx.exercise_sets_block,
            "exercise_library": ctx.exercise_library_block,
            "food_library": ctx.food_library_block,
            "social": ctx.social_block,
            "messages": ctx.messages_block,
            "database_coverage": ctx.raw_tables_block,
        },
    }
