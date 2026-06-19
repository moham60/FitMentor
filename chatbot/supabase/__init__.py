"""
Supabase service layer — Organized by domain responsibility.
Each module provides specific query and mutation functions.
"""

from .base import (
    get_http_client,
    close_http_client,
    headers,
    SUPABASE_URL,
    SUPABASE_KEY,
    SUPABASE_TIMEOUT,
    DEFAULT_LIMIT,
    LIBRARY_LIMIT,
    fetch_table,
    fetch_table_first,
    fetch_table_first_by_id,
    supabase_post,
    supabase_patch,
    supabase_delete,
)
from .user_service import (
    fetch_profile,
    fetch_user_profile,
    fetch_body_measurements,
    fetch_inbody,
    fetch_inbody_results,
    fetch_weight_logs,
)
from .workout_service import (
    fetch_workouts,
    fetch_workout_sessions,
    fetch_workout_routines,
    fetch_workout_routine,
    fetch_workout_history,
    fetch_user_exercises,
    fetch_user_workout_sets,
    fetch_workout_plans,
    fetch_workout_plan_days,
    fetch_workout_plan_exercises,
    insert_workout_routine,
    update_workout_routine_by_id,
    insert_user_workout_session,
    update_user_workout_session_by_id,
)
from .meal_service import (
    fetch_meals,
    fetch_meal_plans,
    fetch_meal_items,
    fetch_user_meal_checkins,
    fetch_food_items,
    fetch_food_item,
)
from .library_service import (
    fetch_exercise_library,
)
from .coach_service import (
    fetch_coach_plan,
    fetch_plan_muscles,
)
from .social_service import (
    fetch_direct_messages,
    fetch_user_follows,
    fetch_user_posts,
    fetch_user_post_comments,
    fetch_user_post_likes,
)
from .context_service import (
    fetch_all_user_tables,
    build_user_context,
)

__all__ = [
    "get_http_client",
    "close_http_client",
    "headers",
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "SUPABASE_TIMEOUT",
    "DEFAULT_LIMIT",
    "LIBRARY_LIMIT",
    "fetch_table",
    "fetch_table_first",
    "fetch_table_first_by_id",
    "supabase_post",
    "supabase_patch",
    "supabase_delete",
    "fetch_profile",
    "fetch_user_profile",
    "fetch_body_measurements",
    "fetch_inbody",
    "fetch_inbody_results",
    "fetch_weight_logs",
    "fetch_workouts",
    "fetch_workout_sessions",
    "fetch_workout_routines",
    "fetch_workout_routine",
    "fetch_workout_history",
    "fetch_user_exercises",
    "fetch_user_workout_sets",
    "fetch_workout_plans",
    "fetch_workout_plan_days",
    "fetch_workout_plan_exercises",
    "insert_workout_routine",
    "update_workout_routine_by_id",
    "insert_user_workout_session",
    "update_user_workout_session_by_id",
    "fetch_meals",
    "fetch_meal_plans",
    "fetch_meal_items",
    "fetch_user_meal_checkins",
    "fetch_food_items",
    "fetch_food_item",
    "fetch_exercise_library",
    "fetch_coach_plan",
    "fetch_plan_muscles",
    "fetch_direct_messages",
    "fetch_user_follows",
    "fetch_user_posts",
    "fetch_user_post_comments",
    "fetch_user_post_likes",
    "fetch_all_user_tables",
    "build_user_context",
]
