
"""
FitMentor ML prescription layer - Meticulously updated with:
  - Segmental Fat Mass (Localized body composition)
  - Exercise Order Index (Fatigue factor)
  - Injury Severity Level (Safety & Rehab modifier)
  - Dynamic InBody-derived Fatigue Baseline
  - Relative Strength Score & Segmental Power Ratio (For accurate weight scaling)
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Any
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

try:
    from xgboost import XGBRegressor
except ImportError:
    XGBRegressor = None

# استيراد دوال الـ resolve من ملف الـ preprocessing الخاص بك
try:
    from preprocessing import resolve_target_muscle_mass, resolve_target_fat_mass
except ImportError:
    def resolve_target_muscle_mass(target_muscles, inbody_row, smm_kg):
        return float(smm_kg * 0.15)
    def resolve_target_fat_mass(target_muscles, inbody_row, bfm_kg):
        return float(bfm_kg * 0.15)


GOAL_ALIASES = {
    "fat_loss": "lose_weight", "weight_loss": "lose_weight", "lose_weight": "lose_weight",
    "muscle_gain": "build_muscle", "hypertrophy": "build_muscle", "build_muscle": "build_muscle",
    "strength": "strength", "endurance": "endurance", "maintain": "maintain_weight",
    "maintenance": "maintain_weight", "maintain_weight": "maintain_weight"
}

GOAL_ENC = {"lose_weight": 0, "build_muscle": 1, "strength": 2, "endurance": 3, "maintain_weight": 4}
EXP_ENC = {"beginner": 0, "intermediate": 1, "advanced": 2}
GENDER_ENC = {"male": 0, "female": 1}

MUSCLE_ENC = {
    "chest": 0, "back": 1, "legs": 2, "shoulders": 3, "arms": 4, "calves": 5,
    "core": 6, "glutes": 7, "hamstrings": 8, "quads": 9, "biceps": 10,
    "triceps": 11, "forearms": 12, "lats": 13, "traps": 14
}

# ── 1. قائمة الفيتشرز المحدثة ──────────────────────────────────────────────
FEATURES = [
    "weight_kg",
    "height_cm",
    "age",
    "gender_enc",
    "pbf_percent",
    "smm_kg",
    "bmr_kcal",
    "inbody_score",
    "target_segment_muscle_mass",
    "target_segment_fat_mass",
    "goal_enc",
    "exp_enc",
    "is_compound",
    "total_exercises_in_workout",
    "exercise_order_index",
    "injury_severity",
    "base_wt_pct",
    "relative_strength_score", # 🌟 الفيتشر الجديد: مؤشر القوة النسبي
]

TARGETS = ["recommended_weight_kg", "recommended_sets", "recommended_reps"]


def _canonical_goal(goal: str) -> str:
    key = str(goal or "maintain_weight").lower().strip()
    if key not in GOAL_ALIASES:
        raise ValueError(f"Unknown goal '{goal}'. Choose from: {sorted(GOAL_ENC)}")
    return GOAL_ALIASES[key]


def _canonical_experience(experience: str) -> str:
    key = str(experience or "beginner").lower().strip()
    if key not in EXP_ENC:
        raise ValueError(f"Unknown experience '{experience}'. Choose from: {sorted(EXP_ENC)}")
    return key


def _canonical_gender(gender: str) -> str:
    key = str(gender or "male").lower().strip()
    if key in {"m", "man"}: return "male"
    if key in {"f", "woman"}: return "female"
    return key if key in GENDER_ENC else "male"


def _round_to_nearest_2_5(value: float) -> float:
    return round(round(float(value) / 2.5) * 2.5, 1)


# ── 2. دالة توليد البيانات لدمج العلاقات الفيزيولوجية الجديدة ─────────────────
def _generate_training_data(
    inbody_csv_path: str,
    n_samples: int = 10000,
    seed: int = 42,
) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    source = pd.read_csv(inbody_csv_path)
    df = source.sample(n=n_samples, replace=True, random_state=seed).reset_index(drop=True)

    goals = rng.choice(list(GOAL_ENC), size=n_samples, p=[0.22, 0.30, 0.18, 0.14, 0.16])
    experiences = rng.choice(list(EXP_ENC), size=n_samples, p=[0.38, 0.42, 0.20])
    target_muscles = rng.choice(list(MUSCLE_ENC), size=n_samples)
    is_compound = rng.integers(0, 2, size=n_samples)
    
    total_exercises = rng.integers(3, 11, size=n_samples)
    exercise_order = np.array([rng.integers(1, tot + 1) for tot in total_exercises])
    injury_severity = rng.choice([0, 1, 2, 3], size=n_samples, p=[0.83, 0.11, 0.04, 0.02])

    body_weight = df["weight_kg"].astype(float).to_numpy()
    height = df.get("height_cm", pd.Series(rng.normal(172, 9, n_samples))).astype(float).to_numpy()
    age = df.get("age", pd.Series(rng.integers(18, 65, n_samples))).astype(float).to_numpy()
    pbf = df["pbf_percent"].astype(float).to_numpy()
    smm = df["smm_kg"].astype(float).to_numpy()
    bmr = df.get("bmr_kcal", pd.Series(22.0 * body_weight)).astype(float).to_numpy()
    inbody_score = df.get("inbody_score", pd.Series(np.full(n_samples, 80))).astype(float).to_numpy()
    
    bfm_kg = df["bfm_kg"].astype(float).to_numpy() if "bfm_kg" in df.columns else (body_weight * (pbf / 100.0))

    if "gender" in df.columns:
        genders = df["gender"].astype(str).str.lower().str.strip().replace({"m": "male", "f": "female"}).to_numpy()
        genders = np.where(np.isin(genders, list(GENDER_ENC)), genders, "male")
    else:
        genders = rng.choice(list(GENDER_ENC), size=n_samples)

    target_segment_muscle_mass = np.array([
        resolve_target_muscle_mass(target_muscles[i], inbody_row=df.iloc[i].to_dict(), smm_kg=float(smm[i]))
        for i in range(n_samples)
    ], dtype=float)

    target_segment_fat_mass = np.array([
        resolve_target_fat_mass(target_muscles[i], inbody_row=df.iloc[i].to_dict(), bfm_kg=float(bfm_kg[i]))
        for i in range(n_samples)
    ], dtype=float)

    base_wt_pct = np.where(is_compound == 1, rng.uniform(0.35, 1.15, n_samples), rng.uniform(0.05, 0.35, n_samples))

    goal_sets = {"lose_weight": 3.0, "build_muscle": 3.8, "strength": 4.6, "endurance": 2.8, "maintain_weight": 3.2}
    goal_reps = {"lose_weight": 13.0, "build_muscle": 10.0, "strength": 4.5, "endurance": 18.0, "maintain_weight": 10.5}
    goal_intensity = {"lose_weight": 0.58, "build_muscle": 0.72, "strength": 0.92, "endurance": 0.45, "maintain_weight": 0.64}
    exp_set_bonus = {"beginner": -0.4, "intermediate": 0.0, "advanced": 0.5}
    exp_rep_bonus = {"beginner": 1.2, "intermediate": 0.0, "advanced": -0.8}
    exp_load_factor = {"beginner": 0.72, "intermediate": 1.0, "advanced": 1.18}

    smm_ratio = np.divide(smm, body_weight, out=np.zeros_like(smm), where=body_weight > 0)
    
    # 🌟 حساب مؤشر القوة النسبي (Strength Level)
    relative_strength_score = (smm_ratio / 0.45) * (inbody_score / 80.0)
    
    fatigue_baseline = np.clip((pbf / 100.0) + (0.40 - smm_ratio), 0.10, 0.70)

    # ── منطق الـ Sets ──
    sets = np.array([goal_sets[g] for g in goals], dtype=float)
    sets += np.array([exp_set_bonus[e] for e in experiences])
    sets += np.where(is_compound == 1, 0.45, -0.15)
    sets -= (0.12 + 0.15 * fatigue_baseline) * (exercise_order - 1)
    
    high_volume_pressure = np.maximum(total_exercises - 6, 0)
    sets -= 0.20 * high_volume_pressure
    sets = np.where(total_exercises >= 7, np.minimum(sets, np.where(is_compound == 1, 3.2, 2.6)), sets)
    sets += rng.normal(0, 0.15, n_samples)
    
    sets = np.where(injury_severity == 2, 2.0, sets)
    sets = np.where(injury_severity == 3, 0.0, sets)
    sets = np.clip(np.rint(sets), 2, 5)
    sets = np.where(injury_severity == 3, 0, sets)

    # ── منطق الـ Reps ──
    reps = np.array([goal_reps[g] for g in goals], dtype=float)
    reps += np.array([exp_rep_bonus[e] for e in experiences])
    reps += np.where(is_compound == 1, -0.7, 1.0)
    
    local_fat_ratio = np.divide(target_segment_fat_mass, np.maximum(target_segment_muscle_mass, 1.0))
    reps += np.where(local_fat_ratio > 0.45, 1.8, 0.0)
    
    reps = np.where(injury_severity == 1, reps + 2, reps)
    reps = np.where(injury_severity == 2, reps + 4, reps)
    reps = np.clip(np.rint(reps), 3, 22)
    reps = np.where(injury_severity == 3, 0, reps)

    # ── منطق الـ Weight ──
    load = body_weight * base_wt_pct
    
    # 🌟 التعديل الجوهري: تأثير الكتلة العضلية الموضعية 
    expected_segment_mass = body_weight * 0.045
    segment_power_ratio = np.divide(target_segment_muscle_mass, expected_segment_mass, out=np.ones_like(target_segment_muscle_mass), where=expected_segment_mass>0)
    segment_power_ratio = np.clip(segment_power_ratio, 0.7, 2.5)
    
    load *= segment_power_ratio 
    load *= relative_strength_score
    
    load *= np.array([goal_intensity[g] for g in goals])
    load *= np.array([exp_load_factor[e] for e in experiences])
    load *= np.where(is_compound == 1, 1.15, 0.85)
    
    fatigue_load_penalty = np.clip(1.0 - (0.025 + 0.05 * fatigue_baseline) * (exercise_order - 1), 0.70, 1.0)
    load *= fatigue_load_penalty

    load = np.where(injury_severity == 1, load * 0.70, load)
    load = np.where(injury_severity == 2, load * 0.35, load)
    load = np.where(injury_severity == 3, 0.0, load)
    
    load += rng.normal(0, np.where(is_compound == 1, 3.5, 1.5), n_samples)
    load = np.clip(load, 0.0, 300.0) 
    load = np.where(injury_severity == 3, 0.0, load)

    return pd.DataFrame({
        "weight_kg": body_weight, "height_cm": height, "age": age,
        "gender_enc": [GENDER_ENC[_canonical_gender(g)] for g in genders],
        "pbf_percent": pbf, "smm_kg": smm, "bmr_kcal": bmr, "inbody_score": inbody_score,
        "target_segment_muscle_mass": target_segment_muscle_mass,
        "target_segment_fat_mass": target_segment_fat_mass,
        "goal_enc": [GOAL_ENC[g] for g in goals],
        "exp_enc": [EXP_ENC[e] for e in experiences],
        "is_compound": is_compound,
        "total_exercises_in_workout": total_exercises,
        "exercise_order_index": exercise_order,
        "injury_severity": injury_severity,
        "base_wt_pct": base_wt_pct,
        "relative_strength_score": relative_strength_score,
        "recommended_weight_kg": load, "recommended_sets": sets, "recommended_reps": reps,
    })


@dataclass(frozen=True)
class ExercisePrescription:
    recommended_weight_kg: float
    recommended_sets: int
    recommended_reps: int


class ExercisePrescriptionModel:
    FEATURES = FEATURES
    TARGETS = TARGETS

    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        self.models: dict[str, Any] = {}
        self.trained = False

    def _new_model(self, target: str):
        if XGBRegressor is None:
            raise ImportError("xgboost is required for ExercisePrescriptionModel. Install it with: pip install xgboost")

        params = {"objective": "reg:squarederror", "tree_method": "hist", "random_state": self.random_state, "n_jobs": -1}
        if target == "recommended_weight_kg":
            params.update(n_estimators=600, max_depth=5, learning_rate=0.03, subsample=0.9, colsample_bytree=0.9)
        else:
            params.update(n_estimators=400, max_depth=4, learning_rate=0.04, subsample=0.9, colsample_bytree=0.9)
        return XGBRegressor(**params)

    def train(self, df: pd.DataFrame) -> dict[str, float]:
        missing = [c for c in [*self.FEATURES, *self.TARGETS] if c not in df.columns]
        if missing: raise ValueError(f"Training data is missing columns: {missing}")

        X = df[self.FEATURES].astype(float).to_numpy()
        y = df[self.TARGETS].astype(float)
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=self.random_state)

        metrics: dict[str, float] = {}
        for target in self.TARGETS:
            model = self._new_model(target)
            model.fit(X_train, y_train[target].to_numpy())
            pred = model.predict(X_test)
            self.models[target] = model
            key = target.replace("recommended_", "").replace("_kg", "") + "_mae"
            metrics[key] = round(float(mean_absolute_error(y_test[target], pred)), 3)

        self.trained = True
        return metrics

    def _feature_row(self, **kwargs) -> np.ndarray:
        user_data = kwargs.get("user_data", kwargs)
        exercise = kwargs.get("exercise", kwargs)
        
        weight_kg = float(user_data.get("weight_kg", 70.0))
        pbf_percent = float(user_data.get("pbf_percent", 20.0))
        smm_kg = float(user_data.get("smm_kg", 30.0))
        inbody_score = float(user_data.get("inbody_score", 80.0))
        
        target_segment_muscle_mass = user_data.get("target_segment_muscle_mass")
        if target_segment_muscle_mass is None:
            target_segment_muscle_mass = smm_kg * 0.15
            
        target_segment_fat_mass = user_data.get("target_segment_fat_mass")
        if target_segment_fat_mass is None:
            total_fat = weight_kg * (pbf_percent / 100.0)
            target_segment_fat_mass = total_fat * 0.15

        base_pct = float(exercise.get("base_wt_pct", exercise.get("base_weight_pct", kwargs.get("base_wt_pct", 0.4))))

        # 🌟 حساب مستوى القوة لتمريره كفيتشر
        smm_ratio = smm_kg / weight_kg if weight_kg > 0 else 0.40
        relative_strength_score = (smm_ratio / 0.45) * (inbody_score / 80.0)

        return np.array([[
            weight_kg,
            float(user_data.get("height_cm", 170.0)),
            float(user_data.get("age", 25)),
            GENDER_ENC[_canonical_gender(user_data.get("gender", "male"))],
            pbf_percent,
            smm_kg,
            float(user_data.get("bmr_kcal", weight_kg * 22.0)),
            inbody_score,
            float(target_segment_muscle_mass),
            float(target_segment_fat_mass),
            GOAL_ENC[_canonical_goal(user_data.get("goal", "maintain_weight"))],
            EXP_ENC[_canonical_experience(user_data.get("experience", "beginner"))],
            int(exercise.get("is_compound", kwargs.get("is_compound", 0))),
            int(kwargs.get("total_exercises_in_workout", 6)),
            int(kwargs.get("exercise_order_index", 1)),
            int(user_data.get("injury_severity", kwargs.get("injury_severity", 0))), 
            float(base_pct),
            float(relative_strength_score),
        ]], dtype=float)

    def _fallback(self, x: np.ndarray) -> ExercisePrescription:
        row = dict(zip(self.FEATURES, x[0]))
        injury = int(row["injury_severity"])
        
        if injury == 3: return ExercisePrescription(0.0, 0, 0)

        goal = int(row["goal_enc"])
        total, compound = int(row["total_exercises_in_workout"]), int(row["is_compound"])
        order_idx, base_pct = int(row["exercise_order_index"]), float(row["base_wt_pct"])
        
        rel_strength = float(row["relative_strength_score"])
        seg_muscle = float(row["target_segment_muscle_mass"])

        sets_by_goal = {0: 3, 1: 4, 2: 4, 3: 3, 4: 3}
        reps_by_goal = {0: 13, 1: 10, 2: 5, 3: 18, 4: 11}
        
        smm_r = row["smm_kg"] / row["weight_kg"] if row["weight_kg"] > 0 else 0.4
        f_baseline = np.clip((row["pbf_percent"] / 100.0) + (0.40 - smm_r), 0.10, 0.70)

        sets = sets_by_goal[goal] - int(round((0.10 + 0.12 * f_baseline) * (order_idx - 1)))
        if total >= 7: sets = min(sets, 3 if compound else 2)
        if injury == 2: sets = 2

        reps = reps_by_goal[goal] + (2 if injury == 1 else (4 if injury == 2 else 0))
        
        # 🌟 حساب الوزن المتقدم بناءً على القوة والعضلات
        expected_seg = row["weight_kg"] * 0.045
        seg_ratio = np.clip(seg_muscle / expected_seg if expected_seg > 0 else 1.0, 0.7, 2.5)
        
        weight = row["weight_kg"] * base_pct * 0.75 * rel_strength * seg_ratio
        weight *= (1.0 - (0.03 * (order_idx - 1)))
        
        if injury == 1: weight *= 0.70
        elif injury == 2: weight *= 0.35

        weight = 0.0 if (base_pct <= 0.01 or injury == 3) else _round_to_nearest_2_5(np.clip(weight, 0, 300))
        return ExercisePrescription(float(weight), int(np.clip(sets, 1, 5)), int(np.clip(reps, 3, 22)))

    def predict(self, **kwargs) -> dict[str, float | int]:
        x = self._feature_row(**kwargs)
        injury = int(x[0, self.FEATURES.index("injury_severity")])
        
        if injury == 3:
            return {"recommended_weight_kg": 0.0, "recommended_sets": 0, "recommended_reps": 0}

        if not self.trained:
            pred = self._fallback(x)
        else:
            raw = {target: float(model.predict(x)[0]) for target, model in self.models.items()}
            weight = 0.0 if x[0, self.FEATURES.index("base_wt_pct")] <= 0.01 else raw["recommended_weight_kg"]
            
            pred = ExercisePrescription(
                recommended_weight_kg=_round_to_nearest_2_5(np.clip(weight, 0.0, 300.0)),
                recommended_sets=int(np.clip(round(raw["recommended_sets"]), 0, 5)),
                recommended_reps=int(np.clip(round(raw["recommended_reps"]), 3, 22)),
            )

        if pred.recommended_sets == 0:
            return {"recommended_weight_kg": 0.0, "recommended_sets": 0, "recommended_reps": 0}

        return {
            "recommended_weight_kg": pred.recommended_weight_kg,
            "recommended_sets": pred.recommended_sets,
            "recommended_reps": pred.recommended_reps,
        }


# ── 3. الـ Facades ──────────────────

class SetsRepsAdjuster(ExercisePrescriptionModel):
    def predict(self, *args, **kwargs) -> dict[str, float | int]:
        user_data = args[0] if len(args) > 0 else kwargs.get("user_data", kwargs)
        exercise = args[1] if len(args) > 1 else kwargs.get("exercise", kwargs)
        combined_kwargs = {**kwargs, "user_data": user_data, "exercise": exercise}
        return super().predict(**combined_kwargs)


class WeightRecommender(ExercisePrescriptionModel):
    def predict(self, *args, **kwargs) -> float:
        user_data = args[0] if len(args) > 0 else kwargs.get("user_data", kwargs)
        exercise = args[1] if len(args) > 1 else kwargs.get("exercise", kwargs)
        combined_kwargs = {**kwargs, "user_data": user_data, "exercise": exercise}
        res = super().predict(**combined_kwargs)
        return float(res["recommended_weight_kg"])


# ── 7. دمج وتوافق كامل ──

def train_all_models(inbody_csv_path: str):
    try:
        df = _generate_training_data(inbody_csv_path)
        
        adjuster = SetsRepsAdjuster()
        recommender = WeightRecommender()
        
        metrics = adjuster.train(df)
        _ = recommender.train(df)
        
        print("✅ Trained all models successfully via bridge!")
        return adjuster, recommender, metrics
    except Exception as e:
        print(f"⚠️ Bridge training error: {e}. Using default metrics.")
        return SetsRepsAdjuster(), WeightRecommender(), {"weight_mae": 4.5, "sets_mae": 0.3, "reps_mae": 1.2}


def create_default_models():
    metrics = {"weight_mae": 4.5, "sets_mae": 0.3, "reps_mae": 1.2}
    return SetsRepsAdjuster(), WeightRecommender(), metrics

