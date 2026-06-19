"""
FitMentor — Output Assembly

Combines:
  - Top-N scored exercises
  - Rule-based base (sets, reps)
  - ML delta adjustments
  - ML weight recommendations
Into a final structured workout plan.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional
import math
from preprocessing import resolve_target_muscle_mass


@dataclass
class ExerciseEntry:
    name:               str
    target_muscles:     list[str]
    equipment:          list[str]
    exercise_type:      str          # compound / isolation
    sets:               int
    reps:               int
    recommended_weight: Optional[float]   # kg, None for bodyweight
    weight_note:        str
    score:              float         # internal ranking score


@dataclass
class WorkoutPlan:
    user_summary:   dict
    goal:           str
    experience:     str
    exercises:      list[ExerciseEntry] = field(default_factory=list)
    training_notes: list[str]           = field(default_factory=list)

    def to_dict(self):
        d = asdict(self)
        return d


def _training_notes(goal: str, experience: str) -> list[str]:
    notes = []
    if goal == "lose_weight":
        notes.append("Rest 45–60 s between sets to keep heart rate elevated.")
        notes.append("Consider supersets for time efficiency.")
    elif goal == "build_muscle":
        notes.append("Rest 60–90 s between sets for hypertrophy stimulus.")
        notes.append("Focus on a slow eccentric (3–4 s lowering phase).")
    elif goal == "strength":
        notes.append("Rest 3–5 min between heavy sets for full CNS recovery.")
        notes.append("Prioritise progressive overload — log weights each session.")
    elif goal == "endurance":
        notes.append("Rest 30–45 s between sets to build muscular endurance.")
        notes.append("Focus on controlled tempo and maintaining form under fatigue.")
    elif goal == "maintain_weight":
        notes.append("Rest 60–90 s between sets for steady-state training.")
        notes.append("Maintain consistent intensity and volume week-to-week.")

    if experience == "beginner":
        notes.append("Learn proper form before increasing load. Consider working with a trainer for the first few sessions.")
    elif experience == "advanced":
        notes.append("Incorporate periodisation: alternate heavy and moderate weeks.")

    return notes


def assemble_plan(
    user_data:    dict,
    top_exercises: list[dict],
    adjuster,         # SetsRepsAdjuster instance
    recommender,      # WeightRecommender instance
    base_sets:    int,
    base_reps:    int,
    inbody_row:   dict | None = None,
) -> WorkoutPlan:

    goal       = user_data["goal"]
    experience = user_data["experience"]
    weight_kg  = user_data["raw"]["weight_kg"]
    height_cm  = user_data["raw"]["height_cm"]
    age        = user_data["raw"].get("age", 25)  # default 25 if not provided
    gender     = user_data["raw"].get("gender", "male")
    smm_kg     = user_data["raw"]["smm_kg"]
    pbf        = user_data["raw"]["pbf_percent"]
    target_muscles = user_data.get("target_muscles", [])
    inbody_details = inbody_row or user_data.get("raw", {}).get("inbody_row", {})
    total_exercises = len(top_exercises)

    def _detail_float(key: str, default: float) -> float:
        if key in inbody_details and inbody_details[key] is not None:
            try:
                return float(inbody_details[key])
            except (TypeError, ValueError):
                return default
        return default

    bmr_kcal = _detail_float("bmr_kcal", weight_kg * 22.0)
    inbody_score = _detail_float("inbody_score", 80.0)

    entries = []
    for ex in top_exercises:
        is_compound = 1 if ex["type"] == "compound" else 0

        # Use exercise target muscles when available, otherwise fallback to user focus muscles.
        ex_muscles = ex.get("muscles") or target_muscles
        target_muscle_mass = resolve_target_muscle_mass(
            ex_muscles,
            inbody_row=inbody_details,
            smm_kg=smm_kg,
        )

        bwp = ex.get("base_weight_pct", 0.0)
        prescription =adjuster.predict(
            weight_kg=weight_kg, height_cm=height_cm, age=age, gender=gender,
            pbf_percent=pbf, smm_kg=smm_kg, bmr_kcal=bmr_kcal,
            inbody_score=inbody_score,
            target_segment_muscle_mass=target_muscle_mass,
            target_muscles=ex_muscles, inbody_row=inbody_details,
            goal=goal, experience=experience, is_compound=is_compound,
            total_exercises_in_workout=total_exercises,
            base_wt_pct=bwp,
        )
        final_sets = int(prescription["recommended_sets"])
        final_reps = int(prescription["recommended_reps"])

        # ── ML weight recommendation ──────────────────────────────────────────
        if bwp == 0.0:
            rec_weight = None
            weight_note = "Bodyweight — no external load needed."
        else:
            rec_weight = float(prescription["recommended_weight_kg"])
            weight_note = (
                f"Start at {rec_weight} kg. Increase by 2.5 kg when all sets "
                f"are completed with good form."
            )

        entries.append(ExerciseEntry(
            name               = ex["name"],
            target_muscles     = ex["muscles"],
            equipment          = ex["equipment"],
            exercise_type      = ex["type"],
            sets               = final_sets,
            reps               = final_reps,
            recommended_weight = rec_weight,
            weight_note        = weight_note,
            score              = round(ex["score"], 4),
        ))

    plan = WorkoutPlan(
        user_summary={
            "weight_kg":   weight_kg,
            "body_fat_pct": pbf,
            "muscle_mass_kg": smm_kg,
            "height_cm":   height_cm,
            "age":         age,
            "gender":      gender,
        },
        goal       = goal,
        experience = experience,
        exercises  = entries,
        training_notes = _training_notes(goal, experience),
    )
    return plan


def format_plan_text(plan: WorkoutPlan) -> str:
    """Human-readable text representation of the plan."""
    lines = []
    lines.append("=" * 60)
    lines.append("         FitMentor - Personalised Workout Plan")
    lines.append("=" * 60)

    u = plan.user_summary
    lines.append(
        f"  Body stats : {u['weight_kg']} kg | "
        f"{u['body_fat_pct']}% fat | "
        f"{u['muscle_mass_kg']} kg muscle | "
        f"{u['height_cm']} cm"
    )
    lines.append(f"  Goal       : {plan.goal.replace('_', ' ').title()}")
    lines.append(f"  Experience : {plan.experience.title()}")
    lines.append("")

    for i, ex in enumerate(plan.exercises, 1):
        lines.append(f"  {i}. {ex.name}")
        lines.append(f"     Muscles   : {', '.join(ex.target_muscles)}")
        lines.append(f"     Equipment : {', '.join(ex.equipment)}")
        lines.append(f"     Type      : {ex.exercise_type.title()}")
        lines.append(f"     Sets x Reps: {ex.sets} x {ex.reps}")
        if ex.recommended_weight:
            lines.append(f"     Weight    : {ex.recommended_weight} kg")
        lines.append(f"     Note      : {ex.weight_note}")
        lines.append("")

    lines.append("-" * 60)
    lines.append("  Training Notes:")
    for note in plan.training_notes:
        lines.append(f"    * {note}")
    lines.append("=" * 60)
    return "\n".join(lines)
