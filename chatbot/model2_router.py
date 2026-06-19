"""
FastAPI bridge for the model2 FitMentor workout generator.
"""

from __future__ import annotations

import logging
import os
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional
from datetime import datetime, timezone
import uuid
import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from cache_layer import get_cache_manager, _cache_key_workout_routine, _cache_key_workout_routines_index
from supabase_client import insert_user_workout_session
from supabase_client import fetch_table_first_by_id, update_user_workout_session_by_id
from supabase_client import (
    fetch_workout_routines,
    fetch_workout_routine,
    insert_workout_routine,
    update_workout_routine_by_id,
)

ROOT_DIR = Path(__file__).resolve().parent.parent
MODEL2_DIR = ROOT_DIR / "model2"
if str(MODEL2_DIR) not in sys.path:
    sys.path.insert(0, str(MODEL2_DIR))

from exercise_db import EXERCISES  # type: ignore  # noqa: E402
from fitmentor import FitMentor  # type: ignore  # noqa: E402
from preprocessing import VALID_EQUIPMENT, VALID_GOALS, VALID_MUSCLES  # type: ignore  # noqa: E402

logger = logging.getLogger(__name__)
router = APIRouter()
ROUTINE_TTL_SECONDS = int(os.getenv("MODEL2_ROUTINE_TTL_SECONDS", str(60 * 60 * 24 * 30)))


GOAL_ALIASES = {
    "lose weight": "lose_weight",
    "fat loss": "lose_weight",
    "fat_loss": "lose_weight",
    "weight loss": "lose_weight",
    "build muscle": "build_muscle",
    "muscle gain": "build_muscle",
    "muscle_gain": "build_muscle",
    "hypertrophy": "build_muscle",
    "strength": "strength",
    "maintain": "maintain_weight",
    "maintain weight": "maintain_weight",
    "endurance": "endurance",
}

EXPERIENCE_BY_ACTIVITY = {
    "sedentary": "beginner",
    "lightly active": "beginner",
    "moderately active": "intermediate",
    "very active": "advanced",
}

EQUIPMENT_ALIASES = {
    "body only": "bodyweight",
    "bodyweight": "bodyweight",
    "cable": "cables",
    "cables": "cables",
    "machine": "machines",
    "machines": "machines",
    "dumbbell": "dumbbells",
    "dumbbells": "dumbbells",
    "barbell": "barbell",
    "kettlebell": "kettlebell",
    "e-z curl bar": "barbell",
    "ez curl bar": "barbell",
}

MUSCLE_ALIASES = {
    "abdominals": "core",
    "abs": "core",
    "core": "core",
    "biceps": "arms",
    "triceps": "arms",
    "forearms": "arms",
    "arms": "arms",
    "calves": "legs",
    "glutes": "legs",
    "hamstrings": "legs",
    "quadriceps": "legs",
    "legs": "legs",
    "chest": "chest",
    "lats": "back",
    "lower back": "back",
    "traps": "back",
    "back": "back",
    "shoulders": "shoulders",
}


class WorkoutRequest(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    height_cm: float = Field(..., gt=0)
    weight_kg: float = Field(..., gt=0)
    pbf_percent: Optional[float] = Field(default=None, ge=3, le=60)
    smm_kg: Optional[float] = Field(default=None, gt=0)
    activity_level: Optional[str] = None
    primary_goal: Optional[str] = None
    goal: Optional[str] = None
    experience: Optional[str] = None
    equipment: list[str] = Field(default_factory=list)
    target_muscles: list[str] = Field(default_factory=list)
    num_exercises: Optional[int] = Field(default=None, ge=1, le=12)
    n_exercises: Optional[int] = Field(default=None, ge=1, le=12)

    @field_validator("equipment", "target_muscles")
    @classmethod
    def require_non_empty(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("Select at least one item.")
        return value


class SaveRoutineRequest(BaseModel):
    user_id: Optional[str] = None
    title: Optional[str] = None
    plan: dict[str, Any]


class StartRoutineRequest(BaseModel):
    user_id: str


def _clean(value: str) -> str:
    return value.strip().lower().replace("_", " ")


def _unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            output.append(value)
    return output


def _normalize_goal(req: WorkoutRequest) -> str:
    raw = req.goal or req.primary_goal or "Build Muscle"
    goal = GOAL_ALIASES.get(_clean(raw), _clean(raw).replace(" ", "_"))
    if goal not in VALID_GOALS:
        raise HTTPException(status_code=422, detail=f"Unsupported goal: {raw}")
    return goal


def _normalize_experience(req: WorkoutRequest) -> str:
    if req.experience:
        experience = _clean(req.experience)
    else:
        experience = EXPERIENCE_BY_ACTIVITY.get(_clean(req.activity_level or ""), "intermediate")
    if experience not in {"beginner", "intermediate", "advanced"}:
        raise HTTPException(status_code=422, detail=f"Unsupported experience: {req.experience}")
    return experience


def _normalize_list(values: list[str], aliases: dict[str, str], valid: set[str], label: str) -> list[str]:
    normalized = _unique([aliases.get(_clean(value), _clean(value)) for value in values])
    unsupported = [value for value in normalized if value not in valid]
    if unsupported:
        raise HTTPException(status_code=422, detail=f"Unsupported {label}: {', '.join(unsupported)}")
    return normalized


def _estimate_body_fat(req: WorkoutRequest) -> float:
    if req.pbf_percent is not None:
        return req.pbf_percent

    height_m = req.height_cm / 100
    bmi = req.weight_kg / max(height_m * height_m, 0.01)
    age = req.age or 30
    gender_factor = 1 if (req.gender or "").lower().startswith("m") else 0
    estimate = (1.2 * bmi) + (0.23 * age) - (10.8 * gender_factor) - 5.4
    return round(min(max(estimate, 8), 45), 1)


def _estimate_muscle_mass(req: WorkoutRequest, pbf_percent: float) -> float:
    if req.smm_kg is not None:
        return req.smm_kg

    lean_mass = req.weight_kg * (1 - (pbf_percent / 100))
    ratio = 0.48 if (req.gender or "").lower().startswith("m") else 0.42
    return round(max(lean_mass * ratio, 10), 1)


@lru_cache(maxsize=1)
def get_fitmentor() -> FitMentor:
    csv_path = Path(os.getenv("FITMENTOR_MODEL2_CSV", str(MODEL2_DIR / "inbody_dataset.csv")))
    logger.info("Initializing model2 FitMentor from %s", csv_path)
    return FitMentor(str(csv_path))


def _rest_seconds(goal: str, exercise_type: str) -> int:
    if goal == "strength":
        return 180 if exercise_type == "compound" else 120
    if goal == "fat_loss":
        return 45
    return 90 if exercise_type == "compound" else 60


def _format_exercise(exercise: Any, goal: str) -> dict[str, Any]:
    target_muscle = ", ".join(m.title() for m in exercise.target_muscles)
    equipment = ", ".join(e.title() for e in exercise.equipment)
    weight = exercise.recommended_weight if exercise.recommended_weight is not None else 0

    return {
        "exercise_name": exercise.name,
        "name": exercise.name,
        "target_muscle": target_muscle,
        "target_muscles": exercise.target_muscles,
        "equipment": equipment,
        "equipment_list": exercise.equipment,
        "is_compound": exercise.exercise_type == "compound",
        "exercise_type": exercise.exercise_type,
        "difficulty": 4 if exercise.exercise_type == "compound" else 3,
        "score": exercise.score,
        "ai_prescription": {
            "sets": exercise.sets,
            "reps": f"{exercise.reps} reps",
            "reps_value": exercise.reps,
            "weight_kg": weight,
            "weight_note": exercise.weight_note,
            "rest_seconds": _rest_seconds(goal, exercise.exercise_type),
        },
    }


def _routine_title(plan: dict[str, Any]) -> str:
    goal = str(plan.get("goal") or "Workout").replace("_", " ").title()
    experience = str(plan.get("experience") or "").title()
    if experience:
        return f"{goal} • {experience}"
    return goal


@router.get("/metadata")
async def model2_metadata():
    return {
        "goals": sorted(VALID_GOALS),
        "muscles": sorted(VALID_MUSCLES),
        "equipment": sorted(VALID_EQUIPMENT),
    }


@router.post("/recommend")
async def recommend_workout(req: WorkoutRequest):
    goal = _normalize_goal(req)
    experience = _normalize_experience(req)
    equipment = _normalize_list(req.equipment, EQUIPMENT_ALIASES, VALID_EQUIPMENT, "equipment")
    target_muscles = _normalize_list(req.target_muscles, MUSCLE_ALIASES, VALID_MUSCLES, "muscle")
    pbf_percent = _estimate_body_fat(req)
    smm_kg = _estimate_muscle_mass(req, pbf_percent)
    n_exercises = req.n_exercises or req.num_exercises or 6

    try:
        plan = get_fitmentor().generate_plan(
            weight_kg=req.weight_kg,
            pbf_percent=pbf_percent,
            smm_kg=smm_kg,
            height_cm=req.height_cm,
            goal=goal,
            experience=experience,
            target_muscles=target_muscles,
            equipment=equipment,
            n_exercises=n_exercises,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("model2 recommendation failed")
        raise HTTPException(status_code=500, detail="FitMentor model2 failed to generate a plan.") from exc

    exercises = [_format_exercise(exercise, goal) for exercise in plan.exercises]
    total_sets = sum(exercise["ai_prescription"]["sets"] for exercise in exercises)
    compound_count = sum(1 for exercise in exercises if exercise["is_compound"])

    return {
        "source": "model2",
        "goal": plan.goal,
        "experience": plan.experience,
        "user_summary": plan.user_summary,
        "exercises": exercises,
        "training_notes": plan.training_notes,
        "workout_stats": {
            "total_sets": total_sets,
            "compound_exercises": compound_count,
            "estimated_duration_minutes": max(20, total_sets * 4),
        },
        "model_metrics": get_fitmentor().evaluate(),
    }


@router.post("/routines/save")
async def save_routine(req: SaveRoutineRequest):
    cache = get_cache_manager()
    routine_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    plan = req.plan or {}
    routine = {
        "id": routine_id,
        "user_id": req.user_id,
        "title": req.title or _routine_title(plan),
        "source_model": "model2",
        "created_at": now_iso,
        "last_used_at": None,
        "plan": plan,
        "plan_version": 1,
        "updated_at": now_iso,
    }

    stored_routine = None
    if req.user_id:
        try:
            stored_routine = await insert_workout_routine(routine)
        except Exception as exc:
            logger.warning("[WorkoutRoutine] Failed to persist routine %s: %s", routine_id, exc)

    if stored_routine:
        routine = stored_routine

    await cache.set(_cache_key_workout_routine(routine_id), routine, ROUTINE_TTL_SECONDS)

    index_key = _cache_key_workout_routines_index(req.user_id)
    index = await cache.get(index_key)
    if not isinstance(index, list):
        index = []
    index = [item for item in index if isinstance(item, dict) and item.get("id") != routine_id]
    index.insert(0, routine)
    await cache.set(index_key, index[:50], ROUTINE_TTL_SECONDS)

    return {"routine": routine}


@router.get("/routines")
async def list_saved_routines(user_id: Optional[str] = None, limit: int = 12):
    if user_id:
        try:
            routines = await fetch_workout_routines(user_id, limit=limit)
            if routines:
                return {"routines": routines[:limit]}
        except Exception as exc:
            logger.warning("[WorkoutRoutine] Failed to load routines for %s: %s", user_id, exc)

    cache = get_cache_manager()
    index_key = _cache_key_workout_routines_index(user_id)
    index = await cache.get(index_key)
    if not isinstance(index, list):
        return {"routines": []}

    routines = [item for item in index if isinstance(item, dict)]
    return {"routines": routines[:limit]}


@router.get("/routines/{routine_id}")
async def get_saved_routine(routine_id: str):
    try:
        routine = await fetch_workout_routine(routine_id)
        if routine:
            return {"routine": routine}
    except Exception as exc:
        logger.warning("[WorkoutRoutine] Failed to load routine %s from DB: %s", routine_id, exc)

    cache = get_cache_manager()
    routine = await cache.get(_cache_key_workout_routine(routine_id))
    if not isinstance(routine, dict):
        raise HTTPException(status_code=404, detail="Saved routine not found")
    return {"routine": routine}


@router.post("/routines/{routine_id}/start")
async def start_saved_routine(routine_id: str, req: StartRoutineRequest):
    cache = get_cache_manager()
    routine = None
    try:
        routine = await fetch_workout_routine(routine_id)
    except Exception as exc:
        logger.warning("[WorkoutRoutine] Failed to load routine %s from DB for start: %s", routine_id, exc)

    if not routine:
        cached_routine = await cache.get(_cache_key_workout_routine(routine_id))
        if isinstance(cached_routine, dict):
            routine = cached_routine

    if not isinstance(routine, dict):
        raise HTTPException(status_code=404, detail="Saved routine not found")

    session_date = datetime.now(timezone.utc).date().isoformat()
    session_payload = {
        "user_id": req.user_id,
        "session_date": session_date,
        "status": "in_progress",
        "notes": "[]",
        "routine_id": routine_id,
    }
    session = await insert_user_workout_session(session_payload)
    session_id = ""
    # If Supabase insert failed, fallback to cache-backed session
    if not session:
        # create a cache-backed session
        session_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        session = {
            "id": session_id,
            "user_id": req.user_id,
            "session_date": session_date,
            "start_time": None,
            "end_time": None,
            "status": "in_progress",
            "notes": [],
            "created_at": now_iso,
            "routine_id": routine_id,
        }
        await cache.set(f"workout:session:{session_id}", session, ROUTINE_TTL_SECONDS)

        index_key = f"workout:sessions:index:{req.user_id or 'anonymous'}"
        index = await cache.get(index_key)
        if not isinstance(index, list):
            index = []
        index = [item for item in index if isinstance(item, dict) and item.get("id") != session_id]
        index.insert(0, session)
        await cache.set(index_key, index[:50], ROUTINE_TTL_SECONDS)
    else:
        session_id = str(session.get("id") or "")
    if session_id:
        try:
            await update_workout_routine_by_id(routine_id, {
                "last_used_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "updated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            })
        except Exception as exc:
            logger.warning("[WorkoutRoutine] Failed to update last_used_at for %s: %s", routine_id, exc)

        routine_state = {
            **routine,
            "last_used_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "active_session_id": session_id,
        }
        await cache.set(_cache_key_workout_routine(routine_id), routine_state, ROUTINE_TTL_SECONDS)

        index_key = _cache_key_workout_routines_index(routine.get("user_id"))
        index = await cache.get(index_key)
        if isinstance(index, list):
            updated_index = []
            for item in index:
                if isinstance(item, dict) and item.get("id") == routine_id:
                    updated_index.append(routine_state)
                else:
                    updated_index.append(item)
            await cache.set(index_key, updated_index[:50], ROUTINE_TTL_SECONDS)

    return {
        "routine": routine,
        "session": session,
    }


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    # Fetch session row from Supabase
    session = await fetch_table_first_by_id("user_workout_sessions", session_id)
    cache = get_cache_manager()
    if not session:
        # fallback to cache
        cached = await cache.get(f"workout:session:{session_id}")
        if isinstance(cached, dict):
            session = cached
        else:
            raise HTTPException(status_code=404, detail="Session not found")

    routine = None
    routine_id = session.get("routine_id")
    if routine_id:
        try:
            routine = await fetch_workout_routine(str(routine_id))
        except Exception as exc:
            logger.warning("[WorkoutRoutine] Failed to load routine %s for session %s: %s", routine_id, session_id, exc)

    if not routine:
        index_key = _cache_key_workout_routines_index(session.get("user_id"))
        index = await cache.get(index_key)
        if isinstance(index, list):
            for item in index:
                if isinstance(item, dict) and item.get("id") == session.get("routine_id"):
                    routine = item
                    break

    return {"session": session, "routine": routine}


@router.post("/sessions/{session_id}/start")
async def start_session(session_id: str):
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    updated = await update_user_workout_session_by_id(session_id, {"start_time": now_iso, "status": "in_progress"})
    if not updated:
        # fallback to cache
        cache = get_cache_manager()
        cached = await cache.get(f"workout:session:{session_id}")
        if not isinstance(cached, dict):
            raise HTTPException(status_code=500, detail="Failed to start session")
        cached["start_time"] = now_iso
        cached["status"] = "in_progress"
        await cache.set(f"workout:session:{session_id}", cached, ROUTINE_TTL_SECONDS)
        updated = cached
    return {"session": updated}


@router.post("/sessions/{session_id}/exercise/{exercise_idx}/complete")
async def complete_exercise(session_id: str, exercise_idx: int):
    # Mark exercise as completed in session.notes JSON array
    session = await fetch_table_first_by_id("user_workout_sessions", session_id)
    cache = get_cache_manager()
    using_cache = False
    if not session:
        cached = await cache.get(f"workout:session:{session_id}")
        if not isinstance(cached, dict):
            raise HTTPException(status_code=404, detail="Session not found")
        session = cached
        using_cache = True

    notes = session.get("notes") or []
    try:
        if isinstance(notes, str):
            completed = json.loads(notes)
        else:
            completed = notes if isinstance(notes, list) else []
    except Exception:
        completed = []

    ident = str(exercise_idx)
    if ident not in completed:
        completed.append(ident)

    status = "completed" if len(completed) >= 1 else "in_progress"

    if using_cache:
        session["notes"] = completed
        session["status"] = status
        await cache.set(f"workout:session:{session_id}", session, ROUTINE_TTL_SECONDS)
        updated = session
    else:
        updated = await update_user_workout_session_by_id(session_id, {"notes": json.dumps(completed), "status": status})
        if not updated:
            # fallback to cache update
            cached = await cache.get(f"workout:session:{session_id}")
            if isinstance(cached, dict):
                cached["notes"] = completed
                cached["status"] = status
                await cache.set(f"workout:session:{session_id}", cached, ROUTINE_TTL_SECONDS)
                updated = cached
            else:
                raise HTTPException(status_code=500, detail="Failed to mark exercise complete")

    return {"session": updated}


@router.post("/sessions/{session_id}/finish")
async def finish_session(session_id: str):
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    updated = await update_user_workout_session_by_id(session_id, {"end_time": now_iso, "status": "completed"})
    if not updated:
        cache = get_cache_manager()
        cached = await cache.get(f"workout:session:{session_id}")
        if not isinstance(cached, dict):
            raise HTTPException(status_code=500, detail="Failed to finish session")
        cached["end_time"] = now_iso
        cached["status"] = "completed"
        await cache.set(f"workout:session:{session_id}", cached, ROUTINE_TTL_SECONDS)
        updated = cached
    return {"session": updated}
