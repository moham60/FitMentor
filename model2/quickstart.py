"""
Quick Start: Generate personalized workout plans with FitMentor
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fitmentor import FitMentor

print("\n" + "="*70)
print("FitMentor - Generate Your Personalized Workout Plan")
print("="*70)

# Option 1: WITHOUT InBody data (uses fallback models)
print("\n[OPTION 1] Generate plan without InBody CSV (Fallback Mode)")
print("-"*70)
fm_fallback = FitMentor()
plan = fm_fallback.generate_plan(
    weight_kg      = 75.0,
    pbf_percent    = 22.0,
    smm_kg         = 28.0,
    height_cm      = 180.0,
    goal           = "muscle_gain",
    experience     = "intermediate",
    target_muscles = ["chest", "back", "arms"],
    equipment      = ["dumbbells", "barbell"],
    n_exercises    = 5,
)

print("Workout Plan Generated:")
print(f"  Goal: {plan.goal}")
print(f"  Experience: {plan.experience}")
print(f"  Exercises:")
for i, ex in enumerate(plan.exercises, 1):
    w = f"{ex.recommended_weight} kg" if ex.recommended_weight else "Bodyweight"
    print(f"    {i}. {ex.name}: {ex.sets}x{ex.reps} ({w})")

# Option 2: WITH InBody CSV data (trains ML models)
print("\n\n[OPTION 2] Generate plan with InBody CSV (ML Training)")
print("-"*70)
csv_path = "inbody_dataset.csv"
if os.path.isfile(csv_path):
    fm_trained = FitMentor(csv_path)
    print(f"Model trained from CSV. Metrics: {fm_trained.evaluate()}")

    plan2 = fm_trained.generate_plan(
        weight_kg      = 80.0,
        pbf_percent    = 18.0,
        smm_kg         = 35.0,
        height_cm      = 178.0,
        goal           = "strength",
        experience     = "advanced",
        target_muscles = ["legs", "back"],
        equipment      = ["barbell", "machines"],
        n_exercises    = 5,
    )

    print("Workout Plan Generated:")
    print(f"  Goal: {plan2.goal}")
    print(f"  Experience: {plan2.experience}")
    print(f"  Exercises:")
    for i, ex in enumerate(plan2.exercises, 1):
        w = f"{ex.recommended_weight} kg" if ex.recommended_weight else "Bodyweight"
        print(f"    {i}. {ex.name}: {ex.sets}x{ex.reps} ({w})")
else:
    print(f"[SKIP] InBody CSV not found at {csv_path}")

print("\n" + "="*70)
print("Done! Check demo.py for more examples.")
print("="*70 + "\n")
