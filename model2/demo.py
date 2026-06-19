"""
FitMentor — Demo: Example Input → Output
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fitmentor import FitMentor
from output_assembly import format_plan_text

CSV_PATH = "inbody_dataset.csv"

def run_demo():
    print("\n[INIT] Initialising FitMentor (training ML models)...\n")
    fm = FitMentor(CSV_PATH)
    print(f"\n[MODELS] Model Evaluation Metrics: {fm.evaluate()}\n")

    # ── Example 1: Fat loss, intermediate female ──────────────────────────────
    print("\n" + "="*60)
    print("EXAMPLE 1 — Fat Loss | Intermediate | Dumbbells + Machines")
    print("="*60)
    plan1 = fm.generate_plan(
        weight_kg      = 82.3,
        pbf_percent    = 27.1,
        smm_kg         = 23.0,
        height_cm      = 175.9,
        goal           = "fat_loss",
        experience     = "intermediate",
        target_muscles = ["chest", "back", "legs"],
        equipment      = ["dumbbells", "machines"],
        n_exercises    = 6,
    )
    print(format_plan_text(plan1))

    # ── Example 2: Muscle gain, beginner male ─────────────────────────────────
    print("\nEXAMPLE 2 — Muscle Gain | Beginner | Bodyweight + Dumbbells")
    print("="*60)
    plan2 = fm.generate_plan(
        weight_kg      = 70.0,
        pbf_percent    = 18.0,
        smm_kg         = 30.0,
        height_cm      = 178.0,
        goal           = "muscle_gain",
        experience     = "beginner",
        target_muscles = ["chest", "arms", "shoulders"],
        equipment      = ["bodyweight", "dumbbells"],
        n_exercises    = 5,
    )
    print(format_plan_text(plan2))

    # ── Example 3: Strength, advanced male ────────────────────────────────────
    print("\nEXAMPLE 3 — Strength | Advanced | Full Gym")
    print("="*60)
    plan3 = fm.generate_plan(
        weight_kg      = 95.0,
        pbf_percent    = 14.0,
        smm_kg         = 42.0,
        height_cm      = 183.0,
        goal           = "strength",
        experience     = "advanced",
        target_muscles = ["back", "legs"],
        equipment      = ["barbell", "machines", "cables"],
        n_exercises    = 5,
    )
    print(format_plan_text(plan3))

    # ── Dynamic update demo ───────────────────────────────────────────────────
    print("\nDYNAMIC UPDATE DEMO — User lost 3 kg body fat (partial recompute only)")
    print("="*60)
    updated_plan = fm.update_plan(
        weight_kg   = 92.0,
        pbf_percent = 12.0,
        smm_kg      = 43.0,
        height_cm   = 183.0,
    )
    print(format_plan_text(updated_plan))


if __name__ == "__main__":
    run_demo()
