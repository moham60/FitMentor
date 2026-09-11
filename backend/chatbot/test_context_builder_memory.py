from __future__ import annotations

from pathlib import Path
import sys

CHATBOT_DIR = Path(__file__).resolve().parent
if str(CHATBOT_DIR) not in sys.path:
    sys.path.insert(0, str(CHATBOT_DIR))

from context_builder import _extract_memory_facts, summarize_persistent_memory_from_conversations


def test_extract_memory_facts_captures_medical_and_diet_details():
    text = "أنا مريض سكري من 2018 وأستخدم metformin 500mg مرتين يوميًا وأحتاج low carb"

    facts = _extract_memory_facts(text)

    assert any("diabetes" in fact.lower() for fact in facts)
    assert any("metformin" in fact.lower() for fact in facts)
    assert any("diet" in fact.lower() or "restriction" in fact.lower() for fact in facts)


def test_persistent_memory_summary_includes_previous_health_context():
    conversations = [
        (
            "Health chat",
            [
                {"role": "user", "content": "أنا عندي مرض السكري من النوع الثاني"},
                {"role": "assistant", "content": "سأراعي ذلك في اقتراحاتك القادمة"},
                {"role": "user", "content": "أستخدم metformin 500mg"},
            ],
        ),
        (
            "Nutrition follow-up",
            [
                {"role": "user", "content": "أفضل low carb وأريد تقليل السكر"},
            ],
        ),
    ]

    summary = summarize_persistent_memory_from_conversations(conversations, current_query="اعمل لي خطة أكل")

    assert "Persistent memory summary:" in summary
    assert "diabetes or blood sugar concerns" in summary.lower()
    assert "metformin" in summary.lower()
    assert "low carb" in summary.lower()