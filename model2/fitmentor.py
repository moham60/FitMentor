"""
FitMentor — Main Pipeline Orchestrator

Usage
-----
from fitmentor import FitMentor

fm = FitMentor("inbody_dataset.csv")
plan = fm.generate_plan(
    weight_kg       = 82.3,
    pbf_percent     = 27.1,
    smm_kg          = 23.0,
    height_cm       = 175.9,
    goal            = "fat_loss",
    experience      = "intermediate",
    target_muscles  = ["chest", "back", "legs"],
    equipment       = ["dumbbells", "machines"],
    n_exercises     = 6,
)
print(plan)
"""

import os
import sys
from typing import TYPE_CHECKING, Optional

# Allow running from the fitmentor directory
sys.path.insert(0, os.path.dirname(__file__))

from preprocessing  import preprocess_user
from scoring        import select_top_exercises, dynamic_update
from ml_models      import train_all_models, create_default_models, SetsRepsAdjuster, WeightRecommender
from output_assembly import assemble_plan, format_plan_text, WorkoutPlan
from rule_based   import get_base_plan

if TYPE_CHECKING:
    from chatbot.rag.chatbot import FitMentorChatbot, ChatResponse


class FitMentor:
    """
    End-to-end personalised workout plan generator with optional RAG chatbot.

    Parameters
    ----------
    inbody_csv_path : str, optional
        Path to the InBody dataset CSV (used to train ML models).
        If None, uses fallback models with conservative defaults.
    rag_chatbot : FitMentorChatbot, optional
        RAG chatbot instance for conversational advice. If provided, enables
        the ask() method for biometric-aware queries.
    """

    def __init__(
        self,
        inbody_csv_path: Optional[str] = None,
        rag_chatbot: Optional["FitMentorChatbot"] = None,
    ):
        if inbody_csv_path and os.path.isfile(inbody_csv_path):
            self.adjuster, self.recommender, self.train_metrics = \
                train_all_models(inbody_csv_path)
        else:
            if inbody_csv_path:
                print(f"Warning: InBody CSV not found at {inbody_csv_path}. "
                      "Using fallback models.")
            self.adjuster, self.recommender, self.train_metrics = \
                create_default_models()
        self._last_user_data = None
        self._last_plan_exercises = None
        self.rag_chatbot = rag_chatbot

    # ── Primary API ───────────────────────────────────────────────────────────

    def generate_plan(
        self,
        weight_kg:      float | None,
        pbf_percent:    float | None,
        smm_kg:         float | None,
        height_cm:      float | None,
        goal:           str,
        experience:     str,
        target_muscles: list[str],
        equipment:      list[str],
        age:            int = 25,
        gender:         str = "male",
        inbody_row:     dict | None = None,
        n_exercises:    int = 6,
        parallel:       bool = True,
    ) -> WorkoutPlan:
        """
        Full pipeline: preprocess → filter → score → rules → ML → assemble.

        Parameters
        ----------
        age : int, optional
            User's age in years (default: 25)
        gender : str, optional
            User's gender: 'male' or 'female' (default: 'male')
        """
        # 1. Preprocessing
        user_data = preprocess_user(
            weight_kg=weight_kg, pbf_percent=pbf_percent,
            smm_kg=smm_kg,       height_cm=height_cm,
            goal=goal,           experience=experience,
            target_muscles=target_muscles, equipment=equipment,
            age=age,             gender=gender,
            inbody_row=inbody_row,
        )

        # 2–3. Filtering + Scoring
        top_exercises = select_top_exercises(user_data, n=n_exercises,
                                             parallel=parallel)

        # 4. Rule-based base plan
        base = get_base_plan(goal, experience)

        # 5–6. ML adjustment + weight recommendation + assembly
        plan = assemble_plan(
            user_data=user_data,
            top_exercises=top_exercises,
            adjuster=self.adjuster,
            recommender=self.recommender,
            base_sets=base.sets,
            base_reps=base.reps,
            inbody_row=inbody_row,
        )

        # Cache for dynamic updates
        self._last_user_data      = user_data
        self._last_plan_exercises = top_exercises

        return plan

    # ── Dynamic update API ────────────────────────────────────────────────────

    def update_plan(
        self,
        weight_kg:   float,
        pbf_percent: float,
        smm_kg:      float,
        height_cm:   float,
        age:         int = 25,
        gender:      str = "male",
    ) -> WorkoutPlan:
        """
        Lightweight update: only re-scores existing exercises + nearby
        candidates. Does NOT re-train models.
        """
        if self._last_user_data is None:
            raise RuntimeError("No previous plan exists. Call generate_plan() first.")

        old = self._last_user_data
        old_inbody_row = old.get("raw", {}).get("inbody_row", {})
        new_user_data = preprocess_user(
            weight_kg=weight_kg, pbf_percent=pbf_percent,
            smm_kg=smm_kg,       height_cm=height_cm,
            goal=old["goal"],           experience=old["experience"],
            target_muscles=old["target_muscles"], equipment=old["equipment"],
            age=age,             gender=gender,
            inbody_row=old_inbody_row,
        )

        updated_exercises = dynamic_update(
            old, new_user_data, self._last_plan_exercises
        )
        base = get_base_plan(new_user_data["goal"], new_user_data["experience"])

        plan = assemble_plan(
            user_data=new_user_data,
            top_exercises=updated_exercises,
            adjuster=self.adjuster,
            recommender=self.recommender,
            base_sets=base.sets,
            base_reps=base.reps,
            inbody_row=old_inbody_row,
        )
        self._last_user_data      = new_user_data
        self._last_plan_exercises = updated_exercises
        return plan

    # ── Evaluation ────────────────────────────────────────────────────────────

    def evaluate(self) -> dict:
        """Return training metrics (MAE for sets, reps, weight)."""
        return self.train_metrics

    # ── RAG Chatbot API ───────────────────────────────────────────────────────

    def ask(self, query: str) -> "ChatResponse":
        """Query the RAG chatbot with current user biometrics.

        Requires that a rag_chatbot was provided at initialization and that
        generate_plan() has been called at least once to set user context.

        Parameters
        ----------
        query : str
            Question or request for fitness/nutrition advice.

        Returns
        -------
        ChatResponse
            Response with answer, sources, and retrieved documents.

        Raises
        ------
        RuntimeError
            If rag_chatbot not initialized or no user data available.
        """
        if self.rag_chatbot is None:
            raise RuntimeError("RAG chatbot not initialized. Provide rag_chatbot at init.")

        if self._last_user_data is None:
            raise RuntimeError(
                "No user data yet. Call generate_plan() first to set context."
            )

        # Extract biometrics from last user data
        biometrics = {
            "weight_kg": self._last_user_data["weight_kg"],
            "pbf_percent": self._last_user_data["pbf_percent"],
            "smm_kg": self._last_user_data["smm_kg"],
            "goal": self._last_user_data["goal"],
        }

        # Include age if available
        if "age" in self._last_user_data:
            biometrics["age"] = self._last_user_data["age"]

        return self.rag_chatbot.chat(query, biometrics)
