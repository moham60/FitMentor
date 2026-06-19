"""
Daily Workflow: How user interacts with FitMentor + Session Tracker
"""

# ═══════════════════════════════════════════════════════════════════════════════
# Daily User Workflow Example
# ═══════════════════════════════════════════════════════════════════════════════

# DAY 1 (Initial Plan)
# ─────────────────────────────────────────────────────────────────────────────

print("""
═══════════════════════════════════════════════════════════════════════════════
DAY 1: Monday - Initial Plan Generation
═══════════════════════════════════════════════════════════════════════════════

Step 1: User Opens App and Enters Biometrics
──────────────────────────────────────────
Input Form:
┌─────────────────────────────────────────┐
│ FitMentor - Generate My Plan            │
├─────────────────────────────────────────┤
│ Weight: 75 kg                           │
│ Body Fat %: 22%                         │
│ Muscle Mass: 28 kg                      │
│ Height: 180 cm                          │
│ Goal: Muscle Gain                       │
│ Experience: Intermediate                │
│ Target Muscles: Chest, Back, Arms       │
│ Equipment: Dumbbells, Barbell           │
│ [GENERATE PLAN]                         │
└─────────────────────────────────────────┘

Step 2: System Generates Personalized Plan
─────────────────────────────────────────
Output:
┌─────────────────────────────────────────┐
│ Your Workout Plan - Muscle Gain Focus   │
├─────────────────────────────────────────┤
│ 1. Barbell Bench Press                  │
│    Weight: 52.5 kg                      │
│    Sets × Reps: 4 × 8                   │
│                                         │
│ 2. Dumbbell Row                         │
│    Weight: 25.0 kg                      │
│    Sets × Reps: 4 × 9                   │
│                                         │
│ 3. Barbell Squat                        │
│    Weight: 75.0 kg                      │
│    Sets × Reps: 4 × 8                   │
│                                         │
│ [START WORKOUT]                         │
└─────────────────────────────────────────┘
""")


# DAY 1 (After Workout)
# ─────────────────────────────────────────────────────────────────────────────

print("""
═══════════════════════════════════════════════════════════════════════════════
DAY 1: Monday - Post-Workout (After 1 hour)
═══════════════════════════════════════════════════════════════════════════════

Step 1: Log Workout Session
─────────────────────────
User fills this form for EACH exercise:

┌──────────────────────────────────────────────────────┐
│ Log Exercise: Barbell Bench Press                    │
├──────────────────────────────────────────────────────┤
│ Weight Used: 52.5 kg          [Planned: 52.5 kg] ✓   │
│ Reps Completed: 8             [Planned: 8]      ✓   │
│ Sets Completed: 4             [Planned: 4]      ✓   │
│ How hard was it? (1-10): 6                      ✓   │
│ Form Quality (1-5): 4                           ✓   │
│ Any pain? (0-10): 0                             ✓   │
│ [SAVE] [NEXT EXERCISE]                              │
└──────────────────────────────────────────────────────┘

│ Log Exercise: Dumbbell Row                           │
├──────────────────────────────────────────────────────┤
│ Weight Used: 25.0 kg          [Planned: 25.0 kg] ✓  │
│ Reps Completed: 9             [Planned: 9]      ✓  │
│ Sets Completed: 4             [Planned: 4]      ✓  │
│ How hard was it? (1-10): 6                      ✓  │
│ Form Quality (1-5): 4                           ✓  │
│ Any pain? (0-10): 0                             ✓  │
│ [SAVE] [NEXT EXERCISE]                             │
└──────────────────────────────────────────────────────┘

│ Log Exercise: Barbell Squat                          │
├──────────────────────────────────────────────────────┤
│ Weight Used: 75.0 kg          [Planned: 75.0 kg] ✓  │
│ Reps Completed: 8             [Planned: 8]      ✓  │
│ Sets Completed: 4             [Planned: 4]      ✓  │
│ How hard was it? (1-10): 7                          │
│ Form Quality (1-5): 4                               │
│ Any pain? (0-10): 0                                 │
│ [SAVE] [FINISH SESSION]                             │
└──────────────────────────────────────────────────────┘

Step 2: Session Summary
──────────────────────
┌──────────────────────────────────────────────────────┐
│ Session Complete!                                    │
├──────────────────────────────────────────────────────┤
│ Duration: 45 minutes                                │
│ Exercises: 3                                        │
│ Total Volume: 18,900 kg                             │
│ Average RPE: 6.3/10                                 │
│ Form Quality: 4.0/5 (Excellent)                     │
│                                                      │
│ Status: All exercises completed as planned! ✓       │
│ [CLOSE]                                             │
└──────────────────────────────────────────────────────┘
""")


# DAY 2-3 (Rest Days)
# ─────────────────────────────────────────────────────────────────────────────

print("""
═══════════════════════════════════════════════════════════════════════════════
DAY 2-3: Recovery Days (No logging needed)
═══════════════════════════════════════════════════════════════════════════════
""")


# DAY 4 (Second Workout)
# ─────────────────────────────────────────────────────────────────────────────

print("""
═══════════════════════════════════════════════════════════════════════════════
DAY 4: Thursday - Second Workout Session
═══════════════════════════════════════════════════════════════════════════════

Step 1: Next Workout (Same as Day 1)
─────────────────────────────────────
┌──────────────────────────────────────────────────────┐
│ Your Workout Plan - Day 4                            │
├──────────────────────────────────────────────────────┤
│ 1. Barbell Bench Press: 52.5 kg × 4 × 8            │
│ 2. Dumbbell Row: 25.0 kg × 4 × 9                   │
│ 3. Barbell Squat: 75.0 kg × 4 × 8                  │
│ [START WORKOUT]                                     │
└──────────────────────────────────────────────────────┘

Step 2: Post-Workout Logging
───────────────────────────
(Same as Day 1... user logs each exercise)

[User completes bench press]
│ Bench Press: 52.5 kg × 8 reps, Sets: 4
│ RPE: 6  | Form: 4  | Pain: 0
│ [SAVE]

[User completes row]
│ Dumbbell Row: 25.0 kg × 9 reps, Sets: 4
│ RPE: 6  | Form: 4  | Pain: 0
│ [SAVE]

[User completes squat]
│ Barbell Squat: 75.0 kg × 8 reps, Sets: 4
│ RPE: 6  | Form: 4  | Pain: 0
│ [SAVE] [FINISH SESSION]
""")


# DAY 8 (After 3 Sessions - Analysis Time!)
# ─────────────────────────────────────────────────────────────────────────────

print("""
═══════════════════════════════════════════════════════════════════════════════
DAY 8: Monday - After 3 Sessions (Analysis & Recommendation)
═══════════════════════════════════════════════════════════════════════════════

Step 1: System Analyzes Progression
───────────────────────────────────
Backend Analysis:

Session 1 (Day 1):  50.0 kg × 7 reps (RPE: 6)
Session 2 (Day 4):  50.0 kg × 8 reps (RPE: 6)  ↑ More reps!
Session 3 (Day 8):  50.0 kg × 8 reps (RPE: 6)  ✓ Consistent

Trends:
├─ Weight: 50.0 kg (no change)
├─ Reps: 7 → 8 (+14.3% improvement!)
├─ Volume: 1,400 → 1,600 → 1,600 kg (+14.3%)
├─ RPE: 6/10 (comfortable zone)
└─ Form: 4/5 (excellent)

Step 2: Smart Recommendation Generated
──────────────────────────────────────
┌──────────────────────────────────────────────────────┐
│ Bench Press - Progression Report                     │
├──────────────────────────────────────────────────────┤
│ Progress: ↑ INCREASING                              │
│ Last 3 Sessions: 7 → 8 → 8 reps                    │
│                                                      │
│ Recommendation: INCREASE WEIGHT                     │
│ ────────────────────────────────────────────────    │
│ Your current weight feels easy (RPE 6/10)           │
│ Form quality is excellent (4/5)                     │
│ You're ready for more challenge!                    │
│                                                      │
│ Next Session Suggestion:                            │
│   Weight: 52.5 kg (↑ 5% increase)                  │
│   Reps: 8                                           │
│   Sets: 4                                           │
│                                                      │
│ What to expect:                                     │
│ • RPE might go up to 7-8 (normal)                  │
│ • Focus on maintaining form quality                │
│ • If you can't do 8 reps: drop back to 50 kg     │
│                                                      │
│ [ACCEPT] [CUSTOMIZE] [IGNORE]                      │
└──────────────────────────────────────────────────────┘

Step 3: Plan Auto-Updates
─────────────────────────
┌──────────────────────────────────────────────────────┐
│ Your Updated Workout Plan - Day 11                   │
├──────────────────────────────────────────────────────┤
│ 1. Barbell Bench Press                              │
│    Weight: 52.5 kg [UPDATED ↑]                      │
│    Sets × Reps: 4 × 8                               │
│    (Increased from 50.0 kg)                         │
│                                                      │
│ 2. Dumbbell Row                                     │
│    Weight: 25.0 kg                                  │
│    Sets × Reps: 4 × 9                               │
│                                                      │
│ 3. Barbell Squat                                    │
│    Weight: 75.0 kg                                  │
│    Sets × Reps: 4 × 8                               │
│ [START WORKOUT]                                     │
└──────────────────────────────────────────────────────┘
""")


# DAY 11 (New Weight)
# ─────────────────────────────────────────────────────────────────────────────

print("""
═══════════════════════════════════════════════════════════════════════════════
DAY 11: Thursday - New Weight Challenge
═══════════════════════════════════════════════════════════════════════════════

User performs workout with new weight:
│ Barbell Bench Press: 52.5 kg × 8 reps
│ RPE: 7 (harder than before, but doable)
│ Form: 4 (still excellent!)
│ [LOGGED]

Result:
✓ Successfully completed at higher weight
✓ RPE increased as expected
✓ Form quality maintained

The system automatically:
├─ Saves this as a new progression point
├─ Updates the trend analysis
└─ Will recommend next step in 3-4 days
""")


# Pattern Over 4 Weeks
# ─────────────────────────────────────────────────────────────────────────────

print("""
═══════════════════════════════════════════════════════════════════════════════
PROGRESSION PATTERN OVER 4 WEEKS
═══════════════════════════════════════════════════════════════════════════════

Week 1-2:
────────
50.0 kg × 7 → 8 reps  (Learn exercise, build confidence)
RPE: 6/10, Form: 4/5

Week 3:
──────
50.0 kg → 52.5 kg × 8 reps  (Weight increased, reps stable)
RPE: 7/10, Form: 4/5

Week 4:
──────
52.5 kg × 8 → 9 reps  (Same weight, more reps)
RPE: 7-8/10, Form: 4/5

Week 5 Prediction:
──────────────────
52.5 kg × 9 → 10 reps OR 55.0 kg × 7 reps
(System will recommend based on performance)

Visual Progression:
┌─────────────────────────────────────────────┐
│                 BENCH PRESS PROGRESS        │
│                                             │
│ Weight (kg)  Volume (reps × sets)           │
│     55 ┤                      ╭─────        │
│     52.5 ┤            ╭──────╮    │         │
│     50 ┤  ╭──────────╮        └───╯        │
│        │  │          │                      │
│    Week 1  2   3   4   5 (projected)       │
│                                             │
│ Trend: ↑ STEADY PROGRESSION ↑               │
│ Status: ON TRACK for goals                 │
└─────────────────────────────────────────────┘
""")

print("\n" + "="*70)
print("This is how SessionTracker + FitMentor work together!")
print("="*70)
