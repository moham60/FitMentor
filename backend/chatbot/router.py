"""
Phase 5: Query Router
Intelligent routing logic that decides retrieval strategy per query.

Routing Decision:
  Personal question    → Supabase only
  Knowledge question   → Vector DB only
  Mixed / ambiguous    → Hybrid retrieval
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class RetrievalMode(str, Enum):
    SUPABASE_ONLY = "supabase_only"      # Personal / profile questions
    VECTOR_ONLY = "vector_only"          # General knowledge / fitness science
    HYBRID = "hybrid"                    # Personalized knowledge questions
    OFF_TOPIC = "off_topic"              # Outside fitness domain


@dataclass
class RoutingDecision:
    mode: RetrievalMode
    confidence: float
    reasoning: str
    intent: str
    source_type: str = "vector"


# ── Keyword Taxonomies ─────────────────────────────────────────────────────────

_PERSONAL_SIGNALS = [
    # English
    "my weight", "my body", "my goal", "my progress", "my workout",
    "my plan", "my diet", "my inbody", "my scan", "my profile",
    "my history", "my bmr", "my fat", "my muscle", "i weigh",
    "for me", "my results", "my data", "my stats", "my calories",
    "recommend for me", "based on my", "my schedule",
    # Arabic
    "وزني", "جسمي", "هدفي", "تقدمي", "برنامجي", "بياناتي",
    "ملفي", "نتائجي", "تدريبي", "خطتي", "حميتي", "بالنسبة لي",
    "لي أنا", "إنبودي", "فحصي", "سعراتي", "عضلاتي", "دهوني",
]

_KNOWLEDGE_SIGNALS = [
    # English
    "what is", "how does", "explain", "difference between", "benefits of",
    "what are", "define", "science behind", "research", "study",
    "general", "typical", "normal", "average", "best practice",
    "should i", "is it good", "effective", "proven", "recommended",
    # Arabic
    "ما هو", "كيف", "اشرح", "الفرق بين", "فوائد",
    "ما هي", "عرّف", "العلم وراء", "بحث", "دراسة",
    "عام", "عادةً", "طبيعي", "متوسط", "أفضل ممارسة",
    "هل يجب", "هل هو جيد", "فعال", "مثبت", "موصى به",
]

_HYBRID_SIGNALS = [
    # English — questions that need both personal data AND knowledge
    "plan for me", "program for me", "should i do", "what should i eat",
    "how many calories", "how much protein", "best exercise for my",
    "workout plan", "meal plan", "optimize", "improve my",
    # Arabic
    "خطة لي", "برنامج لي", "ماذا آكل", "كم سعرة", "كم بروتين",
    "أفضل تمرين", "خطة تدريب", "خطة غذاء", "تحسين",
]

_SITE_CONTENT_SIGNALS = [
    # English
    "website", "site", "page", "pages", "fitmentor", "about us", "about",
    "contact", "pricing", "plans", "features", "faq", "help", "policy",
    "terms", "privacy", "how to use", "dashboard", "profile page",
    "route", "routes", "path", "content of", "page content",
    # Arabic
    "الموقع", "الصفحة", "الصفحات", "عن الموقع", "عن فيتمنتور", "تواصل",
    "الأسعار", "الباقات", "المميزات", "الأسئلة الشائعة", "المساعدة", "السياسة",
    "الشروط", "الخصوصية", "كيفية الاستخدام",
]

_ROUTE_PATH_RE = re.compile(r"(^|\s)/[a-z0-9][a-z0-9_/\-:]*", re.IGNORECASE)

_OFF_TOPIC_SIGNALS = [
    "politics", "movie", "music", "weather", "sports team", "football",
    "سياسة", "فيلم", "موسيقى", "الطقس", "كرة القدم", "مسلسل",
]

_FITNESS_DOMAIN = [
    "workout", "exercise", "nutrition", "diet", "fitness", "gym", "weight",
    "muscle", "protein", "calories", "cardio", "strength", "fat", "body",
    "health", "training", "inbody", "bmr", "metabolism",
    "تمرين", "رياضة", "تغذية", "دهون", "عضلات", "بروتين", "سعرات",
    "جيم", "لياقة", "جسم", "صحة", "تدريب", "كارديو",
]


def route_query(query: str, user_id: str | None = None) -> RoutingDecision:
    """
    Analyze a query and return a routing decision.

        Logic priority:
            1. Off-topic check (exit early)
            2. Personal signals → Supabase
            3. Hybrid signals → both sources
            4. Site content signals → vector/site knowledge
            5. General fitness knowledge → vector
            6. Default → hybrid (safest fallback)
    """
    q = query.lower()

    # ── 1. Off-topic guard ─────────────────────────────────────────────────────
    if _score(q, _OFF_TOPIC_SIGNALS) > 0 and _score(q, _FITNESS_DOMAIN) == 0:
        return RoutingDecision(
            mode=RetrievalMode.OFF_TOPIC,
            confidence=0.9,
            reasoning="Query matches off-topic signals with no fitness domain overlap",
            intent="off_topic",
        )

    # ── 2. No user_id → can't do personal retrieval ────────────────────────────
    if not user_id:
        return RoutingDecision(
            mode=RetrievalMode.VECTOR_ONLY,
            confidence=0.75,
            reasoning="No user_id provided; falling back to knowledge-only retrieval",
            intent="fitness_general",
            source_type="vector",
        )

    # ── Score signals ──────────────────────────────────────────────────────────
    personal_score = _score(q, _PERSONAL_SIGNALS)
    knowledge_score = _score(q, _KNOWLEDGE_SIGNALS)
    hybrid_score = _score(q, _HYBRID_SIGNALS)
    site_score = _score(q, _SITE_CONTENT_SIGNALS)
    route_path_mentioned = bool(_ROUTE_PATH_RE.search(q))

    logger.debug(
        f"[Router] personal={personal_score:.2f} knowledge={knowledge_score:.2f} hybrid={hybrid_score:.2f} site={site_score:.2f}"
    )

    if site_score > 0 or route_path_mentioned:
        return RoutingDecision(
            mode=RetrievalMode.VECTOR_ONLY,
            confidence=min(0.65 + site_score, 0.98),
            reasoning="Query asks about website route/page content",
            intent="site_content",
            source_type="site",
        )

    # ── 3. Personal signal dominates ──────────────────────────────────────────
    if personal_score > max(knowledge_score, site_score):
        return RoutingDecision(
            mode=RetrievalMode.SUPABASE_ONLY,
            confidence=min(0.5 + personal_score, 0.95),
            reasoning="Query explicitly references the user's personal data",
            intent="user_data",
            source_type="supabase",
        )

    # ── 4. Hybrid signals dominate ────────────────────────────────────────────
    if hybrid_score > 0 or (personal_score > 0 and knowledge_score > 0):
        return RoutingDecision(
            mode=RetrievalMode.HYBRID,
            confidence=min(0.5 + hybrid_score + personal_score * 0.3, 0.95),
            reasoning="Query requires both personal data and knowledge retrieval",
            intent="personalized_knowledge",
            source_type="hybrid",
        )

    # ── 5. Site content signal ────────────────────────────────────────────────
    if site_score > 0:
        return RoutingDecision(
            mode=RetrievalMode.VECTOR_ONLY,
            confidence=min(0.5 + site_score, 0.95),
            reasoning="Query asks about website content or pages",
            intent="site_content",
            source_type="site",
        )

    # ── 6. Strong knowledge signal ─────────────────────────────────────────────
    if knowledge_score > 0:
        return RoutingDecision(
            mode=RetrievalMode.VECTOR_ONLY,
            confidence=min(0.5 + knowledge_score, 0.95),
            reasoning="Query is a general fitness knowledge question",
            intent="fitness_general",
            source_type="vector",
        )

    # ── 7. Default → Hybrid (safest) ──────────────────────────────────────────
    return RoutingDecision(
        mode=RetrievalMode.HYBRID,
        confidence=0.5,
        reasoning="Ambiguous query; defaulting to hybrid retrieval for best coverage",
        intent="general",
        source_type="hybrid",
    )


def _score(text: str, signals: list[str]) -> float:
    """Return normalized match score for a list of keyword signals."""
    matches = sum(1 for s in signals if s in text)
    return matches / max(len(signals), 1)
