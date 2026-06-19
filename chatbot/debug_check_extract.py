import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
import context_builder as cb

examples = [
    "أنا مريض سكري من 2018 وأستخدم metformin 500mg مرتين يوميًا وأحتاج low carb",
    "أنا عندي مرض السكري من النوع الثاني",
    "أفضل low carb وأريد تقليل السكر",
]

for t in examples:
    print('---')
    print('TEXT:', t)
    print('FACTS:', cb._extract_memory_facts(t))

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

print('--- SUMMARY ---')
print(cb.summarize_persistent_memory_from_conversations(conversations))
