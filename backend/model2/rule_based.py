"""
FitMentor — Rule-Based Workout Planner

Maps goal → base (sets, reps) using sports-science conventions:
  Lose Weight   → high reps, moderate sets  (12–15 reps, 3–4 sets)
  Build Muscle  → moderate reps, moderate-high sets (6–12 reps, 3–5 sets)
  Strength      → low reps, high sets         (3–6  reps, 4–6 sets)
  Endurance     → very high reps, low sets   (15–20 reps, 2–3 sets)
  Maintain Weight → moderate reps, moderate sets (8–12 reps, 3–4 sets)
"""

from dataclasses import dataclass

# ── Goal rules ────────────────────────────────────────────────────────────────
GOAL_RULES = {
    "lose_weight":    {"sets": (3, 4),  "reps": (12, 15)},
    "build_muscle":   {"sets": (3, 5),  "reps": (6,  12)},
    "strength":       {"sets": (4, 6),  "reps": (3,  6)},
    "endurance":      {"sets": (2, 3),  "reps": (15, 20)},
    "maintain_weight": {"sets": (3, 4),  "reps": (8,  12)},
}

# Experience modifiers (additive on sets, multiplicative on reps)
EXPERIENCE_SET_MOD  = {"beginner": 0, "intermediate": 1, "advanced": 1}
EXPERIENCE_REP_MOD  = {"beginner": 2, "intermediate": 0, "advanced": -1}


@dataclass
class BasePlan:
    sets: int
    reps: int
    goal: str
    experience: str


def get_base_plan(goal: str, experience: str) -> BasePlan:
    """
    Return the midpoint of the goal range, then apply experience modifier.
    """
    rule = GOAL_RULES[goal]
    sets_lo, sets_hi = rule["sets"]
    reps_lo, reps_hi = rule["reps"]

    # midpoint
    base_sets = (sets_lo + sets_hi) // 2
    base_reps = (reps_lo + reps_hi) // 2

    # experience modifier
    base_sets += EXPERIENCE_SET_MOD[experience]
    base_reps += EXPERIENCE_REP_MOD[experience]

    # clip to valid domain
    base_sets = max(sets_lo, min(sets_hi + 1, base_sets))
    base_reps = max(reps_lo, min(reps_hi + 2, base_reps))

    return BasePlan(sets=base_sets, reps=base_reps,
                    goal=goal, experience=experience)
