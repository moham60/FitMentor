"""
Test: FitMentor works without InBody CSV (fallback models) and with parallel matrix scoring.
"""
import sys, os
import time
sys.path.insert(0, os.path.dirname(__file__))

from fitmentor import FitMentor

def test_without_inbody():
    """Test that FitMentor works without InBody CSV using fallback models."""
    print("\n" + "="*70)
    print("TEST 1: FitMentor WITHOUT InBody CSV (Fallback Models)")
    print("="*70)

    fm = FitMentor()  # No CSV path - uses fallback models
    print(f"[OK] Initialized with fallback models. Metrics: {fm.evaluate()}")

    plan = fm.generate_plan(
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
    print(f"[OK] Generated plan with {len(plan.exercises)} exercises")
    assert len(plan.exercises) == 6, "Expected 6 exercises"
    assert all(ex.sets > 0 for ex in plan.exercises), "All exercises should have sets > 0"
    print(f"[OK] Plan details:")
    for i, ex in enumerate(plan.exercises, 1):
        print(f"  {i}. {ex.name}: {ex.sets} sets x {ex.reps} reps")
    return fm


def test_dynamic_update_vectorized(fm):
    """Test dynamic update with vectorized scoring."""
    print("\n" + "="*70)
    print("TEST 2: Dynamic Update with Vectorized Scoring")
    print("="*70)

    start = time.time()
    updated = fm.update_plan(
        weight_kg   = 80.0,
        pbf_percent = 25.0,
        smm_kg      = 24.0,
        height_cm   = 175.9,
    )
    elapsed = time.time() - start

    print(f"[OK] Updated plan in {elapsed*1000:.2f}ms (vectorized matrix multiplication)")
    assert len(updated.exercises) > 0, "Should have exercises in updated plan"
    print(f"[OK] Updated plan details:")
    for i, ex in enumerate(updated.exercises, 1):
        print(f"  {i}. {ex.name}: {ex.sets} sets x {ex.reps} reps")


def test_with_inbody():
    """Test backward compatibility: FitMentor with InBody CSV still works."""
    csv_path = "inbody_dataset.csv"

    if not os.path.isfile(csv_path):
        print(f"\n[SKIP] Skipping test with CSV (not found at {csv_path})")
        return

    print("\n" + "="*70)
    print("TEST 3: FitMentor WITH InBody CSV (Backward Compatibility)")
    print("="*70)

    fm = FitMentor(csv_path)  # With CSV - trains from data
    metrics = fm.evaluate()
    print(f"[OK] Trained models from CSV. Metrics: {metrics}")

    plan = fm.generate_plan(
        weight_kg      = 70.0,
        pbf_percent    = 18.0,
        smm_kg         = 30.0,
        height_cm      = 178.0,
        goal           = "muscle_gain",
        experience     = "beginner",
        target_muscles = ["chest", "arms"],
        equipment      = ["bodyweight", "dumbbells"],
        n_exercises    = 4,
    )
    print(f"[OK] Generated plan with {len(plan.exercises)} exercises")
    assert len(plan.exercises) == 4, "Expected 4 exercises"


def test_vectorized_scoring_performance():
    """Verify vectorized scoring is fast."""
    print("\n" + "="*70)
    print("TEST 4: Vectorized Scoring Performance")
    print("="*70)

    from scoring import score_exercises
    from exercise_db import EXERCISES
    import numpy as np
    from preprocessing import preprocess_user

    user_data = preprocess_user(
        weight_kg=75, pbf_percent=20, smm_kg=30, height_cm=175,
        goal="muscle_gain", experience="intermediate",
        target_muscles=["chest", "back"], equipment=["dumbbells", "barbell"]
    )

    start = time.time()
    scored = score_exercises(user_data["feature_vector"], EXERCISES)
    elapsed = time.time() - start

    print(f"[OK] Scored {len(scored)} exercises in {elapsed*1000:.2f}ms")
    print(f"  Top 3 exercises:")
    for i, ex in enumerate(scored[:3], 1):
        print(f"    {i}. {ex['name']} (score: {ex['score']:.4f})")

    assert len(scored) > 0, "Should have scored exercises"
    assert elapsed < 1.0, "Should score all exercises in <1 second"


if __name__ == "__main__":
    print("\n" + "="*70)
    print("FitMentor Modification Tests: Fallback Models + Vectorized Scoring")
    print("="*70)

    try:
        # Test 1: Fallback models
        fm = test_without_inbody()

        # Test 2: Dynamic update
        test_dynamic_update_vectorized(fm)

        # Test 3: Backward compatibility
        test_with_inbody()

        # Test 4: Performance
        test_vectorized_scoring_performance()

        print("\n" + "="*70)
        print("SUCCESS: ALL TESTS PASSED!")
        print("="*70)
    except Exception as e:
        print(f"\nFAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

