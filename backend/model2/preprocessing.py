"""
FitMentor — Preprocessing Module
Normalises numerical InBody features and one-hot encodes categorical inputs.
Returns a unified user feature vector compatible with the exercise vectors.
"""

import numpy as np
from exercise_db import FEATURE_LABELS, N_FEATURES

# Detailed InBody lean-mass columns used for muscle-specific signals.
MUSCLE_GROUP_COLUMN_MAP = {
    "trunk": ("lean_trunk_kg",),
    "arms": ("lean_ra_kg", "lean_la_kg"),
    "legs": ("lean_rl_kg", "lean_ll_kg"),
}

FAT_GROUP_COLUMN_MAP = {
    "trunk": ("fat_trunk_kg",),
    "arms": ("fat_ra_kg", "fat_la_kg"),
    "legs": ("fat_rl_kg", "fat_ll_kg"),
}

MUSCLE_TO_GROUP = {
    "chest": "trunk",
    "back": "trunk",
    "shoulders": "trunk",
    "core": "trunk",
    "arms": "arms",
    "biceps": "arms",
    "triceps": "arms",
    "forearms": "arms",
    "legs": "legs",
    "quads": "legs",
    "hamstrings": "legs",
    "glutes": "legs",
    "calves": "legs",
}

# ── Reference ranges for min-max normalisation (from InBody population norms) ─
NORM_RANGES = {
    "weight_kg":    (40.0,  150.0),
    "pbf_percent":  (5.0,   50.0),
    "smm_kg":       (10.0,  60.0),
    "height_cm":    (150.0, 200.0),
    "bmi":          (15.0,  45.0),
    "bmr_kcal":     (1000,  3000),
    "inbody_score": (60,    100),
}

VALID_GOALS       = {"lose_weight", "build_muscle", "strength", "endurance", "maintain_weight"}
VALID_EXPERIENCE  = {"beginner", "intermediate", "advanced"}
VALID_MUSCLES     = {"chest", "back", "legs", "shoulders", "arms", "core"}
VALID_EQUIPMENT   = {"bodyweight", "dumbbells", "barbell", "machines",
                     "cables", "kettlebell"}


# ── Helper ────────────────────────────────────────────────────────────────────

def _minmax(value: float, lo: float, hi: float) -> float:
    """Clip then scale to [0, 1]."""
    return float(np.clip((value - lo) / (hi - lo), 0.0, 1.0))


def _validate(value, name: str, valid_set: set):
    if value not in valid_set:
        raise ValueError(f"'{value}' is not a valid {name}. "
                         f"Choose from: {valid_set}")


def _extract_numeric(inbody_row: dict | None, key: str) -> float | None:
    if not inbody_row:
        return None
    if key in inbody_row and inbody_row[key] is not None:
        try:
            return float(inbody_row[key])
        except (TypeError, ValueError):
            return None

    key_lower = key.lower()
    for k, v in inbody_row.items():
        if isinstance(k, str) and k.lower() == key_lower and v is not None:
            try:
                return float(v)
            except (TypeError, ValueError):
                return None
    return None


def resolve_target_muscle_mass(
    target_muscles,
    inbody_row: dict | None,
    smm_kg: float | None = None,
) -> float:
    """Resolve muscle-specific lean mass from detailed InBody columns.

    Mapping rules:
      - trunk group (chest/back/shoulders/core) -> lean_trunk_kg
      - arms group -> average of lean_ra_kg, lean_la_kg
      - legs group -> average of lean_rl_kg, lean_ll_kg
    """
    if isinstance(target_muscles, str):
        muscles = [target_muscles]
    else:
        muscles = list(target_muscles or [])

    values = []
    for muscle in muscles:
        group = MUSCLE_TO_GROUP.get(str(muscle).lower().strip())
        if not group:
            continue

        cols = MUSCLE_GROUP_COLUMN_MAP[group]
        found = [_extract_numeric(inbody_row, col) for col in cols]
        found = [v for v in found if v is not None]
        if found:
            values.append(float(np.mean(found)))

    if values:
        return float(np.mean(values))

    n_targets = max(1, len(muscles))
    if smm_kg is not None:
        return float(smm_kg) / n_targets
    return 2.0


def resolve_target_fat_mass(
    target_muscles,
    inbody_row: dict | None,
    bfm_kg: float | None = None,
) -> float:
    """Resolve muscle-region fat mass from detailed InBody segment columns.

    Mapping rules mirror resolve_target_muscle_mass:
      - trunk group (chest/back/shoulders/core) -> fat_trunk_kg
      - arms group -> average of fat_ra_kg, fat_la_kg
      - legs group -> average of fat_rl_kg, fat_ll_kg
    """
    if isinstance(target_muscles, str):
        muscles = [target_muscles]
    else:
        muscles = list(target_muscles or [])

    values = []
    for muscle in muscles:
        group = MUSCLE_TO_GROUP.get(str(muscle).lower().strip())
        if not group:
            continue

        cols = FAT_GROUP_COLUMN_MAP[group]
        found = [_extract_numeric(inbody_row, col) for col in cols]
        found = [v for v in found if v is not None]
        if found:
            values.append(float(np.mean(found)))

    if values:
        return float(np.mean(values))

    n_targets = max(1, len(muscles))
    if bfm_kg is not None:
        return float(bfm_kg) / n_targets
    return 1.0


# ── Main API ──────────────────────────────────────────────────────────────────

def preprocess_user(
    weight_kg:    float | None = None,
    pbf_percent:  float | None = None,
    smm_kg:       float | None = None,
    height_cm:    float | None = None,
    goal:         str = "maintain_weight",
    experience:   str = "beginner",
    target_muscles: list[str] | None = None,
    equipment:    list[str] | None = None,
    age:          int = 25,
    gender:       str = "male",
    injury_severity: int = 0,
    injury_locations: list[str] | None = None,
    inbody_row:   dict | None = None,
) -> dict:
    """
    Returns
    -------
    dict with keys:
        'feature_vector' : np.ndarray shape (N_FEATURES,) – used for scoring
        'normalized'     : dict  – normalised scalars (debugging / ML input)
        'goal'           : str
        'experience'     : str
        'target_muscles' : list[str]
        'equipment'      : list[str]
        'raw'            : dict  – original unnormalised values (including age, gender)
    """
    # ── Resolve numerics (prefer inbody_row when provided) ──────────────────
    resolved_weight = _extract_numeric(inbody_row, "weight_kg")
    if resolved_weight is None:
        resolved_weight = weight_kg

    resolved_pbf = _extract_numeric(inbody_row, "pbf_percent")
    if resolved_pbf is None:
        resolved_pbf = pbf_percent

    resolved_smm = _extract_numeric(inbody_row, "smm_kg")
    if resolved_smm is None:
        resolved_smm = smm_kg

    resolved_height = _extract_numeric(inbody_row, "height_cm")
    if resolved_height is None:
        resolved_height = height_cm

    if None in {resolved_weight, resolved_pbf, resolved_smm, resolved_height}:
        raise ValueError(
            "Missing required InBody numerics. Provide weight_kg, pbf_percent, "
            "smm_kg, height_cm directly or inside inbody_row."
        )

    weight_kg = float(resolved_weight)
    pbf_percent = float(resolved_pbf)
    smm_kg = float(resolved_smm)
    height_cm = float(resolved_height)

    # ── Validate categoricals ────────────────────────────────────────────────
    goal = goal.lower().strip()
    experience = experience.lower().strip()
    gender = gender.lower().strip()
    target_muscles = [m.lower().strip() for m in (target_muscles or [])]
    equipment      = [e.lower().strip() for e in (equipment or [])]
    injury_locations = [m.lower().strip() for m in (injury_locations or [])]
    injury_severity = int(np.clip(injury_severity, 0, 3))

    _validate(goal,       "goal",       VALID_GOALS)
    _validate(experience, "experience", VALID_EXPERIENCE)
    if gender not in {"male", "female"}:
        raise ValueError(f"'{gender}' is not valid. Choose 'male' or 'female'.")
    for m in target_muscles:
        _validate(m, "muscle", VALID_MUSCLES)
    for eq in equipment:
        _validate(eq, "equipment", VALID_EQUIPMENT)
    for m in injury_locations:
        _validate(m, "injury location", VALID_MUSCLES)

    # ── Normalise numerics ───────────────────────────────────────────────────
    norm = {
        "weight_kg":   _minmax(weight_kg,   *NORM_RANGES["weight_kg"]),
        "pbf_percent": _minmax(pbf_percent, *NORM_RANGES["pbf_percent"]),
        "smm_kg":      _minmax(smm_kg,      *NORM_RANGES["smm_kg"]),
        "height_cm":   _minmax(height_cm,   *NORM_RANGES["height_cm"]),
    }

    # ── Build feature vector (same index space as exercise vectors) ──────────
    v = np.zeros(N_FEATURES)

    # Goal
    v[FEATURE_LABELS.index(goal)] = 1.0

    # Experience
    v[FEATURE_LABELS.index(experience)] = 1.0

    # Target muscles (spread weight evenly)
    for m in target_muscles:
        v[FEATURE_LABELS.index(m)] = 1.0 / len(target_muscles)

    # Equipment (spread weight evenly)
    for eq in equipment:
        v[FEATURE_LABELS.index(eq)] = 1.0 / len(equipment)

    # Modulate goal intensity with body-composition signals
    # More fat → boost lose_weight signal
    # More muscle → boost build_muscle/strength signals
    fat_ratio    = norm["pbf_percent"]
    muscle_ratio = norm["smm_kg"]

    if goal == "lose_weight":
        v[FEATURE_LABELS.index("lose_weight")] *= (1.0 + fat_ratio)
    elif goal == "build_muscle":
        v[FEATURE_LABELS.index("build_muscle")] *= (1.0 + muscle_ratio)
    elif goal == "strength":
        v[FEATURE_LABELS.index("strength")] *= (1.0 + muscle_ratio)
    elif goal == "endurance":
        v[FEATURE_LABELS.index("endurance")] *= (1.0 + fat_ratio)

    return {
        "feature_vector": v,
        "normalized":     norm,
        "goal":           goal,
        "experience":     experience,
        "target_muscles": target_muscles,
        "equipment":      equipment,
        "injury_severity": injury_severity,
        "injury_locations": injury_locations,
        "raw": {
            "weight_kg":   weight_kg,
            "pbf_percent": pbf_percent,
            "smm_kg":      smm_kg,
            "height_cm":   height_cm,
            "age":         age,
            "gender":      gender,
            "injury_severity": injury_severity,
            "injury_locations": injury_locations,
            "inbody_row":  dict(inbody_row or {}),
        },
    }
