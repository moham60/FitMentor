"""
Phase 2: Context Builder with caching.

Builds a compact, prompt-friendly snapshot from every readable Supabase table
in the FitMentor schema.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Optional

from cache_layer import USER_CONTEXT_TTL, _cache_key_user_context, get_cache_manager
from supabase_client import fetch_all_user_tables, fetch_table
from page_documentation import get_all_pages_summary

logger = logging.getLogger(__name__)


@dataclass
class StructuredContext:
    user_id: str
    profile_block: str = ""
    inbody_block: str = ""
    inbody_results_block: str = ""
    coach_plan_block: str = ""
    workout_plans_block: str = ""
    meal_plans_block: str = ""
    meal_items_block: str = ""
    meal_checkins_block: str = ""
    meals_block: str = ""
    workouts_block: str = ""
    workout_sessions_block: str = ""
    exercise_sets_block: str = ""
    exercise_library_block: str = ""
    food_library_block: str = ""
    social_block: str = ""
    messages_block: str = ""
    pages_documentation_block: str = ""
    raw_tables_block: str = ""
    has_data: bool = False

    def as_full_context(self) -> str:
        sections = [
            ("User Profile", self.profile_block),
            ("InBody", self.inbody_block),
            ("InBody Results", self.inbody_results_block),
            ("Coach Plan", self.coach_plan_block),
            ("Workout Plans", self.workout_plans_block),
            ("Meal Plans", self.meal_plans_block),
            ("Meal Items", self.meal_items_block),
            ("Meal Check-ins", self.meal_checkins_block),
            ("Meals", self.meals_block),
            ("Workouts", self.workouts_block),
            ("Workout Sessions", self.workout_sessions_block),
            ("Exercise Sets", self.exercise_sets_block),
            ("Exercise Library", self.exercise_library_block),
            ("Food Library", self.food_library_block),
            ("Social Activity", self.social_block),
            ("Direct Messages", self.messages_block),
            ("FitMentor Pages & Features", self.pages_documentation_block),
            ("Database Coverage", self.raw_tables_block),
        ]
        parts = [f"## {title}\n{block}" for title, block in sections if block]
        return "\n\n".join(parts) if parts else "No structured data."

    def as_compact(self) -> str:
        return " | ".join(
            block.split("\n")[0]
            for block in [
                self.profile_block,
                self.inbody_block,
                self.coach_plan_block,
                self.meal_plans_block,
                self.workouts_block,
            ]
            if block
        ) or "No user data"


async def build_user_context(user_id: str) -> StructuredContext:
    """Build cached user context from all schema tables."""
    cache = get_cache_manager()
    cache_key = _cache_key_user_context(user_id)

    cached_ctx = await cache.get(cache_key)
    if cached_ctx:
        logger.debug("[ContextBuilder] Cache HIT for user %s", user_id)
        return cached_ctx

    logger.debug("[ContextBuilder] Cache MISS for user %s", user_id)
    ctx = StructuredContext(user_id=user_id)

    try:
        # Include page documentation for all users
        ctx.pages_documentation_block = get_all_pages_summary()

        db = await fetch_all_user_tables(user_id)
        food_lookup = _lookup(db.get("food_items", []), "id")
        exercise_lookup = _lookup(db.get("exercise_library", []), "id")

        profile = db.get("profiles")
        if profile:
            ctx.profile_block = _format_profile(profile)
        if db.get("body_measurements"):
            ctx.inbody_block = _format_inbody(db["body_measurements"][0])
        if db.get("inbody_results"):
            ctx.inbody_results_block = _format_inbody_results(db["inbody_results"])
        if db.get("selected_coach_plan"):
            ctx.coach_plan_block = _format_coach_plan(
                db["selected_coach_plan"],
                db.get("selected_plan_muscles", []),
            )
        elif db.get("coach_plans"):
            ctx.coach_plan_block = _format_generic_rows(
                "Available coach plans",
                db["coach_plans"],
                ["name", "type", "description"],
            )
        if db.get("workout_plans"):
            ctx.workout_plans_block = _format_workout_plans(
                db.get("workout_plans", []),
                db.get("workout_plan_days", []),
                db.get("workout_plan_exercises", []),
            )
        if db.get("user_meal_plans"):
            ctx.meal_plans_block = _format_meal_plans(db["user_meal_plans"])
        if db.get("user_meal_items"):
            ctx.meal_items_block = _format_meal_items(db["user_meal_items"], food_lookup)
        if db.get("user_meal_checkins"):
            ctx.meal_checkins_block = _format_generic_rows(
                "Recent meal check-ins",
                db["user_meal_checkins"],
                ["meal_type", "checked_at"],
            )
        if db.get("meals"):
            ctx.meals_block = _format_meals(db["meals"])
        if db.get("workouts"):
            ctx.workouts_block = _format_workouts(db["workouts"], db.get("exercises", []))
        if db.get("user_workout_sessions"):
            ctx.workout_sessions_block = _format_workout_sessions(db["user_workout_sessions"])
        if db.get("user_exercise_sets"):
            ctx.exercise_sets_block = _format_exercise_sets(db["user_exercise_sets"], exercise_lookup)
        if db.get("exercise_library"):
            ctx.exercise_library_block = _format_library(
                db["exercise_library"],
                ["name_en", "muscle_group", "equipment", "difficulty"],
                limit=15,
            )
        if db.get("food_items"):
            ctx.food_library_block = _format_library(
                db["food_items"],
                ["name_en", "category", "calories_per_100g", "protein_per_100g"],
                limit=15,
            )

        ctx.social_block = _format_social(db)
        if db.get("direct_messages"):
            ctx.messages_block = _format_messages(db["direct_messages"], user_id)
        ctx.raw_tables_block = _format_table_coverage(db)

        ctx.has_data = any(
            getattr(ctx, field).strip()
            for field in (
                "profile_block",
                "inbody_block",
                "inbody_results_block",
                "coach_plan_block",
                "workout_plans_block",
                "meal_plans_block",
                "meal_items_block",
                "meal_checkins_block",
                "meals_block",
                "workouts_block",
                "workout_sessions_block",
                "exercise_sets_block",
                "exercise_library_block",
                "food_library_block",
                "social_block",
                "messages_block",
                "pages_documentation_block",
            )
        )
        logger.info("[ContextBuilder] Built context for %s (has_data=%s)", user_id, ctx.has_data)
    except Exception:
        logger.exception("[ContextBuilder] Error building context for %s", user_id)

    await cache.set(cache_key, ctx, USER_CONTEXT_TTL)
    return ctx


async def build_context_from_profile(profile: dict, user_id: Optional[str] = None) -> StructuredContext:
    """Fallback for clients that send profile data when Supabase has no rows."""
    ctx = StructuredContext(user_id=user_id or str(profile.get("user_id") or "client-profile"))
    ctx.profile_block = _format_profile(profile)
    ctx.has_data = bool(ctx.profile_block)
    return ctx


async def build_recent_conversation_memory(
    user_id: str,
    conversation_id: Optional[str] = None,
    current_query: Optional[str] = None,
    *,
    conversation_limit: int = 3,
    messages_per_conversation: int = 4,
) -> str:
    """Build a compact memory block from the user's recent chatbot conversations."""
    conversations = await fetch_table(
        "chatbot_conversations",
        filters={"user_id": f"eq.{user_id}"},
        select="id,title,updated_at",
        order="updated_at.desc",
        limit=conversation_limit,
    )

    if not conversations:
        return ""

    if conversation_id:
        current = next((row for row in conversations if row.get("id") == conversation_id), None)
        if current:
            conversations = [current] + [row for row in conversations if row.get("id") != conversation_id]

    sections: list[str] = []
    for conversation in conversations[:conversation_limit]:
        messages = await fetch_table(
            "chatbot_messages",
            filters={"conversation_id": f"eq.{conversation.get('id')}"},
            select="role,content,created_at",
            order="created_at.desc",
            limit=messages_per_conversation,
        )
        if not messages:
            continue

        if current_query and messages:
            latest_message = messages[0]
            latest_content = _normalize_message_text(latest_message.get("content") or "").lower()
            query_text = _normalize_message_text(current_query).lower()
            if latest_message.get("role") == "user" and latest_content == query_text:
                messages = messages[1:]
                if not messages:
                    continue

        ordered_messages = list(reversed(messages))
        title = (conversation.get("title") or "New chat").strip() or "New chat"
        sections.append(f"Conversation: {title} | updated: {conversation.get('updated_at')}")

        for message in ordered_messages:
            role = (message.get("role") or "message").strip()
            content = _normalize_message_text(message.get("content") or "")
            if not content:
                continue
            sections.append(f"- {role}: {content}")

    return "\n".join(sections)


async def build_persistent_user_memory(
    user_id: str,
    current_query: Optional[str] = None,
    *,
    conversation_limit: int = 20,
    messages_per_conversation: int = 8,
) -> str:
    """Build a long-term memory summary from the user's prior chatbot history."""
    conversations = await fetch_table(
        "chatbot_conversations",
        filters={"user_id": f"eq.{user_id}"},
        select="id,title,updated_at",
        order="updated_at.desc",
        limit=conversation_limit,
    )

    if not conversations:
        return ""

    conversation_messages: list[tuple[str, list[dict]]] = []
    for conversation in conversations:
        messages = await fetch_table(
            "chatbot_messages",
            filters={"conversation_id": f"eq.{conversation.get('id')}"},
            select="role,content,created_at",
            order="created_at.asc",
            limit=messages_per_conversation,
        )
        if messages:
            conversation_messages.append((conversation.get("title") or "New chat", messages))

    snapshot = summarize_persistent_memory_from_conversations(
        conversation_messages,
        current_query=current_query,
    )

    if not snapshot:
        return ""

    return snapshot


def summarize_persistent_memory_from_conversations(
    conversation_messages: list[tuple[str, list[dict]]],
    current_query: Optional[str] = None,
) -> str:
    facts: list[str] = []
    snippets: list[str] = []
    seen_facts: set[str] = set()
    seen_snippets: set[str] = set()

    current_query_norm = _normalize_message_text(current_query or "").lower() if current_query else ""

    for title, messages in conversation_messages:
        if not messages:
            continue

        for message in messages:
            content = _normalize_message_text(message.get("content") or "")
            if not content:
                continue

            if current_query_norm and message.get("role") == "user":
                if current_query_norm == content.lower():
                    continue

            extracted_facts = _extract_memory_facts(content)
            for fact in extracted_facts:
                if fact not in seen_facts:
                    seen_facts.add(fact)
                    facts.append(fact)

            if _is_memory_relevant(content):
                snippet_key = content.lower()
                if snippet_key not in seen_snippets:
                    seen_snippets.add(snippet_key)
                    snippets.append(content)

        # Add a compact conversation label when there is meaningful history.
        if snippets and title and title.strip():
            label = f"Conversation topic: {title.strip()}"
            if label not in seen_snippets:
                seen_snippets.add(label)
                snippets.append(label)

    if not facts and not snippets:
        return ""

    lines = ["Persistent memory summary:"]
    if facts:
        lines.append("Important user facts:")
        lines.extend(f"- {fact}" for fact in facts[:25])
    if snippets:
        lines.append("Relevant prior chat snippets:")
        lines.extend(f"- {snippet}" for snippet in snippets[:15])
    return "\n".join(lines)


def _lookup(rows: list[dict], key: str) -> dict:
    return {row.get(key): row for row in rows if row.get(key)}


def _normalize_message_text(text: str, limit: int = 220) -> str:
    text = " ".join(text.replace("\n", " ").split())
    if len(text) > limit:
        return text[:limit].rstrip() + "..."
    return text


def _is_memory_relevant(text: str) -> bool:
    lowered = text.lower()
    return any(keyword in lowered for keyword in _MEMORY_RELEVANT_KEYWORDS)


def _extract_memory_facts(text: str) -> list[str]:
    lowered = text.lower()
    facts: list[str] = []

    # Quick substring checks for common Arabic terms that may not be
    # consistently captured by word-boundary regexes across environments.
    if any(a in lowered for a in ("مرض السكري", "مريض سكري", "سكري", "سكر")):
        facts.append("User mentioned diabetes or blood sugar concerns")

    for pattern, label in _MEMORY_FACT_PATTERNS:
        if pattern.search(lowered):
            facts.append(label)

    age_match = re.search(r"\b(\d{1,2})\s*(?:yo|years? old|سنة|عام)\b", lowered)
    if age_match:
        facts.append(f"User age mentioned: {age_match.group(1)}")

    weight_match = re.search(r"\b(\d{2,3}(?:\.\d+)?)\s*(?:kg|kilos?|كيلو|كجم)\b", lowered)
    if weight_match:
        facts.append(f"Body weight mentioned: {weight_match.group(1)} kg")

    height_match = re.search(r"\b(\d{2,3}(?:\.\d+)?)\s*(?:cm|centimeters?|سم)\b", lowered)
    if height_match:
        facts.append(f"Height mentioned: {height_match.group(1)} cm")

    calories_match = re.search(r"\b(\d{3,4})\s*(?:calories|kcal|سعر(?:ة|ات))\b", lowered)
    if calories_match:
        facts.append(f"Target calories mentioned: {calories_match.group(1)}")

    medication_match = re.search(r"\b(metformin|insulin|ozempic|glucophage|lantus|novorapid|humalog|statin|bp meds|blood pressure meds)\b", lowered)
    if medication_match:
        facts.append(f"Medication mentioned: {medication_match.group(1)}")

    condition_match = re.search(r"\b(diabetes|prediabetes|high blood pressure|hypertension|asthma|pcos|thyroid|cholesterol)\b", lowered)
    if condition_match:
        facts.append(f"Health condition mentioned: {condition_match.group(1)}")

    goal_match = re.search(r"\b(losing fat|lose fat|fat loss|build muscle|gain muscle|bulk|cut|maintain weight)\b", lowered)
    if goal_match:
        facts.append(f"Goal mentioned: {goal_match.group(1)}")

    restriction_match = re.search(r"\b(allergic to|allergy to|avoid|can't eat|cannot eat|don't eat|no sugar|low sugar|low carb|no dairy|no gluten)\b.{0,40}", lowered)
    if restriction_match:
        facts.append("Nutrition restriction or food preference mentioned")

    if re.search(r"\bvegan\b", lowered):
        facts.append("User prefers a vegan diet")
    if re.search(r"\bvegetarian\b", lowered):
        facts.append("User prefers a vegetarian diet")
    if re.search(r"\bdiabetic\b", lowered):
        facts.append("User has diabetes-related dietary needs")

    return facts


_MEMORY_RELEVANT_KEYWORDS = [
    "diabetes",
    "diabetic",
    "blood sugar",
    "sugar disease",
    "سكري",
    "سكر",
    "hypertension",
    "prediabetes",
    "pressure",
    "ضغط",
    "injury",
    "pain",
    "knee",
    "back",
    "allergy",
    "allergic",
    "vegan",
    "medication",
    "medicine",
    "أدوية",
    "workout",
    "diet",
    "meal",
    "exercise",
    "goal",
]

_MEMORY_FACT_PATTERNS = [
    (re.compile(r"\b(diabetes|type 1 diabetes|type 2 diabetes|prediabetes|blood sugar|sugar disease|سكري|سكر|ارتفاع السكر)\b", re.IGNORECASE), "User mentioned diabetes or blood sugar concerns"),
    (re.compile(r"\b(hypertension|high blood pressure|blood pressure|ضغط|ضغط دم|pressure)\b", re.IGNORECASE), "User mentioned high blood pressure or hypertension"),
    (re.compile(r"\b(knee pain|back pain|shoulder pain|injury|tendon|ligament|arthritis|sprain|shoulder impingement|disc)\b", re.IGNORECASE), "User mentioned pain or an injury that may affect exercise selection"),
    (re.compile(r"\b(allergy|allergic|lactose intolerance|gluten free|celiac|avoid sugar|no sugar|low sugar|low carb|keto)\b", re.IGNORECASE), "User mentioned a food allergy or dietary restriction"),
    (re.compile(r"\b(weight loss|lose weight|fat loss|burn fat|cutting|lean down|lose fat)\b", re.IGNORECASE), "User's goal appears to be fat loss or weight loss"),
    (re.compile(r"\b(muscle gain|build muscle|gain muscle|bulk|hypertrophy|increase muscle)\b", re.IGNORECASE), "User's goal appears to be muscle gain"),
    (re.compile(r"\b(endurance|stamina|cardio|conditioning|fitness)\b", re.IGNORECASE), "User mentioned endurance or cardio improvement"),
    (re.compile(r"\b(vegan|vegetarian|high protein|low carb|keto|intermittent fasting|low sugar|diabetic diet)\b", re.IGNORECASE), "User mentioned a diet style or macro preference"),
]


def _format_profile(p: dict) -> str:
    fields = [
        ("Name", p.get("full_name")),
        ("Account type", p.get("account_type")),
        ("Age", p.get("age")),
        ("Gender", p.get("gender")),
        ("Height", f"{p.get('height_cm')} cm" if p.get("height_cm") is not None else None),
        ("Weight", f"{p.get('weight_kg')} kg" if p.get("weight_kg") is not None else None),
        ("Activity level", p.get("activity_level")),
        ("Goal", p.get("goal")),
        ("Daily calories", p.get("daily_calories")),
        ("TDEE", p.get("tdee")),
        ("BMR", p.get("bmr")),
        ("Maintain calories", p.get("calories_maintain")),
        ("Loss calories", p.get("calories_loss")),
        ("Gain calories", p.get("calories_gain")),
        ("Plan status", p.get("plan_status")),
        ("Coach plan status", p.get("coach_plan_status")),
    ]
    return "\n".join(f"{label}: {value}" for label, value in fields if value is not None)


def _format_inbody(i: dict) -> str:
    fields = [
        ("Date", i.get("measurement_date")),
        ("Weight", f"{i.get('weight_kg')} kg" if i.get("weight_kg") is not None else None),
        ("Muscle mass", f"{i.get('muscle_mass_kg')} kg" if i.get("muscle_mass_kg") is not None else None),
        ("Body fat", f"{i.get('body_fat_percentage')}%" if i.get("body_fat_percentage") is not None else None),
        ("Water", f"{i.get('water_percentage')}%" if i.get("water_percentage") is not None else None),
        ("Bone mass", f"{i.get('bone_mass_kg')} kg" if i.get("bone_mass_kg") is not None else None),
        ("BMI", i.get("bmi")),
        ("BMR", i.get("bmr")),
    ]
    return "\n".join(f"{label}: {value}" for label, value in fields if value is not None)


def _format_inbody_results(results: list[dict]) -> str:
    lines = []
    for row in results:
        result = row.get("result") or {}
        summary = ", ".join(f"{k}: {v}" for k, v in list(result.items())[:8])
        lines.append(f"- {row.get('created_at')} | raw_path: {row.get('raw_path')} | {summary}")
    return "\n".join(lines)


def _format_coach_plan(plan: dict, muscles: list[dict]) -> str:
    lines = [f"{plan.get('name')} ({plan.get('type')})"]
    if plan.get("description"):
        lines.append(f"Description: {plan.get('description')}")
    for muscle in muscles[:8]:
        lines.append(
            f"- {muscle.get('muscle_name')} | {muscle.get('sets')} sets | "
            f"{muscle.get('reps')} reps | equipment: {muscle.get('equipment')}"
        )
    return "\n".join(lines)


def _format_workout_plans(plans: list[dict], days: list[dict], plan_exercises: list[dict]) -> str:
    day_lookup: dict[str, list[dict]] = {}
    for day in days:
        day_lookup.setdefault(day.get("plan_id"), []).append(day)

    exercise_counts: dict[str, int] = {}
    for exercise in plan_exercises:
        day_id = exercise.get("plan_day_id")
        exercise_counts[day_id] = exercise_counts.get(day_id, 0) + 1

    lines = []
    for plan in plans[:5]:
        lines.append(
            f"- {plan.get('name_en')} | {plan.get('difficulty')} | {plan.get('goal')} | "
            f"{plan.get('duration_weeks')} weeks | {plan.get('days_per_week')} days/week"
        )
        for day in day_lookup.get(plan.get("id"), [])[:3]:
            lines.append(
                f"  Day {day.get('day_number')}: {day.get('name_en')} | "
                f"{exercise_counts.get(day.get('id'), 0)} exercises"
            )
    return "\n".join(lines)


def _format_meal_plans(plans: list[dict]) -> str:
    return "\n".join(
        f"- {plan.get('plan_date')} | {plan.get('target_calories')} kcal | meals: {plan.get('meals_count')}"
        for plan in plans[:5]
    )


def _format_meal_items(items: list[dict], food_lookup: dict) -> str:
    lines = []
    for item in items[:15]:
        food = food_lookup.get(item.get("food_item_id"), {})
        lines.append(
            f"- {item.get('meal_type')}: {food.get('name_en', 'Unknown food')} | "
            f"{item.get('quantity_g')}g"
        )
    return "\n".join(lines)


def _format_meals(meals: list[dict]) -> str:
    return "\n".join(
        f"- {meal.get('meal_date')} | {meal.get('meal_type')} | {meal.get('name')} | "
        f"{meal.get('calories')} kcal | P/C/F: {meal.get('protein_g')}/"
        f"{meal.get('carbs_g')}/{meal.get('fat_g')}"
        for meal in meals[:10]
    )


def _format_workouts(workouts: list[dict], exercises: list[dict]) -> str:
    exercise_by_workout: dict[str, list[dict]] = {}
    for exercise in exercises:
        exercise_by_workout.setdefault(exercise.get("workout_id"), []).append(exercise)

    lines = []
    for workout in workouts[:8]:
        lines.append(
            f"- {workout.get('workout_date')} | {workout.get('name') or workout.get('workout_type')} | "
            f"{workout.get('duration_minutes')} min | {workout.get('calories_burned')} kcal"
        )
        for exercise in exercise_by_workout.get(workout.get("id"), [])[:4]:
            lines.append(
                f"  {exercise.get('name')}: {exercise.get('sets')} sets x "
                f"{exercise.get('reps')} reps @ {exercise.get('weight_kg')} kg"
            )
    return "\n".join(lines)


def _format_workout_sessions(sessions: list[dict]) -> str:
    return "\n".join(
        f"- {session.get('session_date')} | {session.get('status')} | "
        f"start: {session.get('start_time')} | end: {session.get('end_time')}"
        for session in sessions[:8]
    )


def _format_exercise_sets(sets: list[dict], exercise_lookup: dict) -> str:
    lines = []
    for row in sets[:20]:
        exercise = exercise_lookup.get(row.get("exercise_id"), {})
        lines.append(
            f"- {exercise.get('name_en', row.get('exercise_id'))} | set {row.get('set_number')} | "
            f"{row.get('reps_completed')} reps | {row.get('weight_kg')} kg | "
            f"completed: {row.get('is_completed')}"
        )
    return "\n".join(lines)


def _format_library(rows: list[dict], fields: list[str], limit: int = 10) -> str:
    lines = []
    for row in rows[:limit]:
        values = [f"{field}: {row.get(field)}" for field in fields if row.get(field) is not None]
        if values:
            lines.append("- " + " | ".join(values))
    return "\n".join(lines)


def _format_social(db: dict) -> str:
    parts = []
    if db.get("posts"):
        parts.append(_format_generic_rows("Posts", db["posts"], ["content", "visibility", "created_at"], limit=5))
    if db.get("post_comments"):
        parts.append(_format_generic_rows("Comments", db["post_comments"], ["content", "created_at"], limit=5))
    if db.get("post_likes"):
        parts.append(f"Post likes: {len(db['post_likes'])} recent likes")
    if db.get("user_follows"):
        parts.append(f"Follows/followers: {len(db['user_follows'])} recent relationships")
    return "\n".join(part for part in parts if part)


def _format_messages(messages: list[dict], user_id: str) -> str:
    lines = []
    for message in messages[:10]:
        direction = "sent" if message.get("sender_id") == user_id else "received"
        body = (message.get("body") or "").replace("\n", " ")[:160]
        lines.append(f"- {message.get('created_at')} | {direction} | {message.get('message_type')}: {body}")
    return "\n".join(lines)


def _format_generic_rows(title: str, rows: list[dict], fields: list[str], limit: int = 8) -> str:
    lines = [f"{title}: {len(rows)} row(s)"]
    for row in rows[:limit]:
        values = []
        for field in fields:
            value = row.get(field)
            if value is None:
                continue
            if isinstance(value, str):
                value = value.replace("\n", " ")[:180]
            values.append(f"{field}: {value}")
        if values:
            lines.append("- " + " | ".join(values))
    return "\n".join(lines)


def _format_table_coverage(db: dict) -> str:
    table_names = [
        "body_measurements",
        "coach_plans",
        "direct_messages",
        "exercise_library",
        "exercises",
        "food_items",
        "inbody_results",
        "meals",
        "plan_muscles",
        "post_comments",
        "post_likes",
        "posts",
        "profiles",
        "user_exercise_sets",
        "user_follows",
        "user_meal_checkins",
        "user_meal_items",
        "user_meal_plans",
        "user_workout_sessions",
        "weight_logs",
        "workout_plan_days",
        "workout_plan_exercises",
        "workout_plans",
        "workouts",
    ]
    lines = []
    for name in table_names:
        value = db.get(name)
        count = len(value) if isinstance(value, list) else 1 if value else 0
        lines.append(f"- {name}: {count} row(s) available")
    return "\n".join(lines)
