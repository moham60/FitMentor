"""
Phase 6: /api/recommendation endpoint
Generates personalized AI recommendations by combining
Supabase user data with the Hybrid RAG engine when available.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from context_builder import build_user_context
from engine import get_rag_engine
from router import RetrievalMode, RoutingDecision

logger = logging.getLogger(__name__)
router = APIRouter()


class RecommendationRequest(BaseModel):
    user_id: str
    recommendation_type: str = "general"  # general | workout | nutrition | recovery


RECOMMENDATION_QUERIES = {
    "general": (
        "Based on my complete body composition data, InBody results, and current fitness goals, "
        "give me a personalized overview of what I should focus on this week."
    ),
    "workout": (
        "Create a detailed, personalized weekly workout plan optimized for my body composition, "
        "fitness level, and goals. Include sets, reps, and rest periods."
    ),
    "nutrition": (
        "Design a daily nutrition plan with specific macros and calorie targets based on my "
        "InBody BMR, body fat percentage, muscle mass, and fitness goals."
    ),
    "recovery": (
        "Based on my recent workout history and body composition, recommend a personalized "
        "recovery and sleep optimization plan."
    ),
}


@router.post("")
async def get_recommendation(req: RecommendationRequest):
    """
    Generate a fully personalized recommendation.
    Always uses HYBRID routing to combine personal data + knowledge.
    """
    query = RECOMMENDATION_QUERIES.get(
        req.recommendation_type,
        RECOMMENDATION_QUERIES["general"],
    )

    logger.info(f"[/recommendation] user_id={req.user_id} type={req.recommendation_type}")

    # Always build full user context for recommendations
    structured_ctx = await build_user_context(req.user_id)
    if not structured_ctx.has_data:
        return {
            "user_id": req.user_id,
            "recommendation_type": req.recommendation_type,
            "recommendations": [],
            "message": "No user data found in Supabase yet. Complete your profile and InBody scan to unlock personalized recommendations.",
            "personalized_from": {
                "profile": False,
                "inbody": False,
                "coach_plan": False,
                "meal_plans": False,
                "meal_items": False,
                "meals": False,
                "workout_history": False,
            },
            "knowledge_sources": [],
            "follow_up_questions": [
                "Complete your profile to get personalized recommendations.",
                "Would you like general workout or nutrition guidance for now?",
            ],
        }

    # Force HYBRID routing for recommendations
    routing = RoutingDecision(
        mode=RetrievalMode.HYBRID,
        confidence=0.95,
        reasoning="Recommendation endpoint always uses hybrid retrieval",
        intent="personalized_knowledge",
    )

    engine = get_rag_engine()
    result = await engine.generate(
        query=query,
        routing=routing,
        structured_ctx=structured_ctx,
        user_id=req.user_id,
    )

    return {
        "user_id": req.user_id,
        "recommendation_type": req.recommendation_type,
        "recommendations": [result.answer],
        "recommendation": result.answer,
        "personalized_from": {
            "profile": bool(structured_ctx.profile_block),
            "inbody": bool(structured_ctx.inbody_block),
            "coach_plan": bool(structured_ctx.coach_plan_block),
            "meal_plans": bool(structured_ctx.meal_plans_block),
            "meal_items": bool(structured_ctx.meal_items_block),
            "meals": bool(structured_ctx.meals_block),
            "workout_history": bool(structured_ctx.workouts_block),
        },
        "knowledge_sources": result.sources,
        "follow_up_questions": result.follow_up_questions,
    }
