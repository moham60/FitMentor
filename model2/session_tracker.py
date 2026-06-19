"""
FitMentor Session Tracker - Track exercise performance and predict progression
"""
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Optional, List
import json
import numpy as np

# ── Data Models ────────────────────────────────────────────────────────────────

@dataclass
class ExerciseLog:
    """Single exercise execution record"""
    exercise_name: str
    weight_kg: float
    reps_completed: int
    sets_completed: int
    rpe: int                      # 1-10 (Rated Perceived Exertion)
    form_quality: int             # 1-5 (1=poor, 5=perfect)
    reps_target: int = 0
    sets_target: int = 0
    pain_during: int = 0          # 0-10 (0=none, 10=severe)
    avg_rest_sec: int = 0
    exercise_completed: bool = True


@dataclass
class SessionRecord:
    """Complete training session"""
    user_id: str
    session_date: datetime
    exercises: List[ExerciseLog]
    fatigue_before: int = 5       # 1-10
    recovery_feeling: int = 5     # 1-10
    body_weight_kg: float = 0.0
    session_duration_min: int = 0
    notes: str = ""

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "session_date": self.session_date.isoformat(),
            "exercises": [asdict(ex) for ex in self.exercises],
            "fatigue_before": self.fatigue_before,
            "recovery_feeling": self.recovery_feeling,
            "body_weight_kg": self.body_weight_kg,
            "session_duration_min": self.session_duration_min,
            "notes": self.notes,
        }


# ── Progression Analysis ───────────────────────────────────────────────────────

class ProgressionAnalyzer:
    """Analyze exercise progression and predict improvements"""

    def __init__(self):
        self.history = {}  # {user_id: {exercise_name: [SessionRecord, ...]}}

    def add_session(self, session: SessionRecord):
        """Add a completed session to history"""
        if session.user_id not in self.history:
            self.history[session.user_id] = {}

        for exercise in session.exercises:
            key = exercise.exercise_name
            if key not in self.history[session.user_id]:
                self.history[session.user_id][key] = []

            self.history[session.user_id][key].append({
                "date": session.session_date,
                "weight_kg": exercise.weight_kg,
                "reps": exercise.reps_completed,
                "sets": exercise.sets_completed,
                "rpe": exercise.rpe,
                "form": exercise.form_quality,
                "volume": exercise.weight_kg * exercise.reps_completed * exercise.sets_completed,
            })

    def get_progression(self, user_id: str, exercise_name: str, last_n: int = 5):
        """Get progression history for an exercise"""
        if user_id not in self.history or exercise_name not in self.history[user_id]:
            return None

        records = self.history[user_id][exercise_name][-last_n:]
        return records

    def analyze_trend(self, user_id: str, exercise_name: str):
        """Analyze progression trend"""
        records = self.get_progression(user_id, exercise_name)
        if not records or len(records) < 2:
            return {"status": "insufficient_data"}

        weights = np.array([r["weight_kg"] for r in records])
        reps = np.array([r["reps"] for r in records])
        volumes = np.array([r["volume"] for r in records])
        rpes = np.array([r["rpe"] for r in records])

        # Calculate trends
        weight_change = (weights[-1] - weights[0]) / weights[0] * 100
        reps_change = (reps[-1] - reps[0]) / reps[0] * 100 if reps[0] > 0 else 0
        volume_change = (volumes[-1] - volumes[0]) / volumes[0] * 100
        avg_rpe = float(rpes.mean())

        # Progression rate (% per day)
        days_passed = (records[-1]["date"] - records[0]["date"]).days
        weight_per_day = weight_change / max(days_passed, 1)

        return {
            "status": "progressing",
            "weight_change_pct": round(weight_change, 1),
            "reps_change_pct": round(reps_change, 1),
            "volume_change_pct": round(volume_change, 1),
            "weight_per_day_pct": round(weight_per_day, 2),
            "avg_rpe": round(avg_rpe, 1),
            "form_quality_avg": round(np.array([r["form"] for r in records]).mean(), 1),
            "last_session": {
                "date": records[-1]["date"].strftime("%Y-%m-%d"),
                "weight": records[-1]["weight_kg"],
                "reps": records[-1]["reps"],
                "rpe": records[-1]["rpe"],
            }
        }

    def get_recommendation(self, user_id: str, exercise_name: str):
        """Get recommendation for next session"""
        trend = self.analyze_trend(user_id, exercise_name)

        if trend["status"] != "progressing":
            return {
                "action": "repeat_same_weight",
                "reason": "Insufficient history to assess progression"
            }

        last_weight = trend["last_session"]["weight"]
        last_reps = trend["last_session"]["reps"]
        weight_change = trend["weight_change_pct"]
        rpe = trend["avg_rpe"]
        form = trend["form_quality_avg"]

        # Decision logic
        if rpe > 8.5 and form < 3:
            return {
                "action": "reduce_weight",
                "reason": "RPE too high and form suffering",
                "suggested_weight": round(last_weight * 0.95, 1),
                "focus": "Improve form quality"
            }

        elif weight_change > 5 and rpe < 7:
            return {
                "action": "increase_weight",
                "reason": "Strong progression and RPE in zone",
                "suggested_weight": round(last_weight + 2.5, 1),
                "focus": "Maintain form quality"
            }

        elif weight_change > 0 and rpe >= 6 and rpe <= 8:
            return {
                "action": "increase_reps",
                "reason": "Steady progression, push volume",
                "suggested_reps": last_reps + 1,
                "suggested_weight": last_weight,
                "focus": "Same weight, increase volume"
            }

        else:
            return {
                "action": "repeat_same",
                "reason": "Steady state - maintain current",
                "suggested_weight": last_weight,
                "suggested_reps": last_reps
            }


# ── Example Usage ──────────────────────────────────────────────────────────────

def example_usage():
    """Example: Track 4 bench press sessions and get recommendation"""
    print("\n" + "="*70)
    print("FitMentor Session Tracker - Example")
    print("="*70)

    analyzer = ProgressionAnalyzer()

    # Simulate 4 sessions over 12 days
    dates = [
        datetime(2026, 5, 9),
        datetime(2026, 5, 12),
        datetime(2026, 5, 16),
        datetime(2026, 5, 20),
    ]

    session_data = [
        (50.0, 7, 6),  # Day 1: 50kg x7 reps, RPE 6
        (50.0, 8, 6),  # Day 4: 50kg x8 reps, RPE 6 (better!)
        (52.5, 8, 7),  # Day 8: 52.5kg x8 reps, RPE 7 (increased weight)
        (52.5, 9, 8),  # Day 12: 52.5kg x9 reps, RPE 8 (more reps)
    ]

    for date, (weight, reps, rpe) in zip(dates, session_data):
        exercise = ExerciseLog(
            exercise_name="Barbell Bench Press",
            weight_kg=weight,
            reps_completed=reps,
            sets_completed=4,
            reps_target=8,
            sets_target=4,
            rpe=rpe,
            form_quality=4,
        )

        session = SessionRecord(
            user_id="USER_001",
            session_date=date,
            exercises=[exercise],
            body_weight_kg=75.0,
            session_duration_min=45,
        )

        analyzer.add_session(session)

    # Get progression analysis
    print("\nBench Press Progression (Last 4 Sessions):")
    print("-" * 70)

    progression = analyzer.get_progression("USER_001", "Barbell Bench Press", last_n=4)
    for i, record in enumerate(progression, 1):
        print(f"Session {i} ({record['date'].strftime('%Y-%m-%d')}): "
              f"{record['weight_kg']} kg × {record['reps']} reps "
              f"(RPE: {record['rpe']}/10, Volume: {record['volume']:.0f})")

    # Get analysis
    print("\nTrend Analysis:")
    print("-" * 70)
    trend = analyzer.analyze_trend("USER_001", "Barbell Bench Press")
    print(f"Weight Change: {trend['weight_change_pct']}%")
    print(f"Reps Change: {trend['reps_change_pct']}%")
    print(f"Volume Change: {trend['volume_change_pct']}%")
    print(f"Progression Rate: {trend['weight_per_day_pct']}% per day")
    print(f"Average RPE: {trend['avg_rpe']}/10")
    print(f"Form Quality: {trend['form_quality_avg']}/5")

    # Get recommendation
    print("\nRecommendation for Next Session:")
    print("-" * 70)
    rec = analyzer.get_recommendation("USER_001", "Barbell Bench Press")
    print(f"Action: {rec['action'].upper()}")
    print(f"Reason: {rec['reason']}")
    if "suggested_weight" in rec:
        print(f"Suggested Weight: {rec['suggested_weight']} kg")
    if "suggested_reps" in rec:
        print(f"Suggested Reps: {rec['suggested_reps']}")
    print(f"Focus: {rec.get('focus', 'Maintain current performance')}")

    print("\n" + "="*70)


if __name__ == "__main__":
    example_usage()
