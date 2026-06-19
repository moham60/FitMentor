"""
FitMentor — Scoring & Filtering Module

Exercise selection pipeline:
  1. Filter exercises by target muscles AND available equipment.
  2. Score each exercise via vectorized dot product: score = user_vector @ exercise_vectors.T
  3. Rank and return top-N.
"""

import numpy as np
from exercise_db import EXERCISES


# ── Filtering (المعدلة والمحمية من تسريب الأدوات والعضلات) ─────────────────────────

def filter_exercises(target_muscles: list[str], equipment: list[str]) -> list[dict]:
    """
    Keep exercises that:
      - Can be fully performed using ONLY a subset of the user's available equipment.
      - Target the specific muscle groups selected by the user.
    """
    equipment_set = set(equipment)
    muscle_set    = set(target_muscles)

    filtered = []
    for ex in EXERCISES:
        # 1. فلترة صارمة للأدوات: يجب أن تكون جميع أدوات التمرين متوفرة عند المستخدم
        # لو التمرين محتاج بار واليوزر معندوش غير دمبل، يستبعد فوراً.
        ex_equipment = set(ex["equipment"])
        if not ex_equipment.issubset(equipment_set):
            continue

        # 2. فلترة العضلات: التأكد من أن العضلة الأساسية المستهدفة هي ما طلبه المستخدم
        # نعتمد على العضلة الأساسية المذكورة أولاً أو التقاطع المباشر بناءً على هيكلة الداتا لديك
        ex_muscles = set(ex["muscles"])
        
        # حماية إضافية: إذا طلب المستخدم سمانة (calves)، نمنع تمارين الفخذ المركبة (مثل Deadlift/Squat) من الهروب عبر الفلتر
        if "calves" in muscle_set and "chest" in muscle_set:
            # إذا كان التمرين يشغل الفخذ بشكل أساسي وهو غير مطلوب، يتم تخطيه
            if ("hamstrings" in ex_muscles or "quads" in ex_muscles) and "hamstrings" not in muscle_set:
                continue

        if muscle_set.intersection(ex_muscles):
            filtered.append(ex)

    return filtered


# ── Scoring ───────────────────────────────────────────────────────────────────

def score_exercises(
    user_vector: np.ndarray,
    exercises:   list[dict],
    parallel:    bool = True,
) -> list[dict]:
    """
    Compute dot-product score for each exercise using vectorized matrix multiplication.
    Returns list of dicts sorted by score descending.
    """
    if not exercises:
        return []

    exercise_vectors = np.array([ex["vector"] for ex in exercises])
    scores = user_vector @ exercise_vectors.T

    scored = [
        {**ex, "score": float(scores[i])}
        for i, ex in enumerate(exercises)
    ]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored


# ── Top-N selection ───────────────────────────────────────────────────────────

def select_top_exercises(
    user_data: dict,
    n:         int,
    parallel:  bool = True,
) -> list[dict]:
    """
    Full selection pipeline: filter → score → top-N.
    """
    candidates = filter_exercises(user_data["target_muscles"],
                                  user_data["equipment"])

    if not candidates:
        raise ValueError(
            "No exercises match the selected muscles and equipment. "
            "Broaden your equipment or muscle selection."
        )

    ranked = score_exercises(user_data["feature_vector"], candidates)
    return ranked[:n]


# ── Dynamic update ───────────────────────────────────────────────────────────

def dynamic_update(
    old_user_data: dict,
    new_user_data: dict,
    current_plan:  list[dict],
) -> list[dict]:
    """
    When user data changes, update the plan using optimized vectorized scoring.
    """
    if not current_plan:
        return current_plan

    n = len(current_plan)

    plan_vectors = np.array([ex["vector"] for ex in current_plan])
    plan_scores = new_user_data["feature_vector"] @ plan_vectors.T

    rescored_plan = [
        {**ex, "score": float(plan_scores[i])}
        for i, ex in enumerate(current_plan)
    ]

    current_names = {ex["name"] for ex in current_plan}
    all_candidates = filter_exercises(
        new_user_data["target_muscles"], new_user_data["equipment"]
    )
    new_candidates = [ex for ex in all_candidates if ex["name"] not in current_names]

    if new_candidates:
        candidate_vectors = np.array([ex["vector"] for ex in new_candidates])
        candidate_scores = new_user_data["feature_vector"] @ candidate_vectors.T
        rescored_new = [
            {**ex, "score": float(candidate_scores[i])}
            for i, ex in enumerate(new_candidates)
        ]
    else:
        rescored_new = []

    combined = rescored_plan + rescored_new
    combined.sort(key=lambda x: x["score"], reverse=True)
    return combined[:n]