"""
Page Documentation & Features
Provides comprehensive documentation for all FitMentor pages,
including features, data displayed, and usage instructions.
"""

from __future__ import annotations

import logging
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class PageDoc:
    """Page documentation with features and usage."""
    name: str
    path: str
    description: str
    features: list[str]
    data_displayed: list[str]
    usage_tips: list[str]


# ── Page Documentation Database ────────────────────────────────────────────────

PAGES_DOCUMENTATION: dict[str, PageDoc] = {
    "dashboard": PageDoc(
        name="Dashboard",
        path="/dashboard",
        description="Main hub showing overview of fitness progress, recent activities, and quick stats",
        features=[
            "Quick stats cards (weight, body fat, muscle mass, workouts)",
            "Recent workout sessions summary",
            "Upcoming scheduled workouts",
            "Body composition trends",
            "Daily activity summary",
            "Quick action buttons to start workouts or log meals",
        ],
        data_displayed=[
            "Current weight and body composition (from latest InBody)",
            "Recent workout sessions (last 5-10)",
            "Scheduled workouts for the week",
            "Calorie intake vs goal for today",
            "Step count and activity level",
        ],
        usage_tips=[
            "Dashboard is your starting point for daily fitness routine",
            "Click on any stat card to see detailed historical data",
            "Use quick action buttons to immediately start tracking",
            "Monitor trends to track progress over time",
        ],
    ),

    "workouts": PageDoc(
        name="Workouts",
        path="/workouts",
        description="Smart workout generator and management. AI-powered system that creates personalized workout plans based on your profile and goals.",
        features=[
            "Smart Workout Generator with AI-powered plan creation",
            "Custom profile setup (age, weight, height, activity level, goals)",
            "Target muscle group selection",
            "Equipment availability selection",
            "Exercise count customization (3-10 exercises)",
            "Detailed exercise prescriptions with sets, reps, weight, rest periods",
            "Plan saving and history tracking",
            "Difficulty ratings for exercises",
        ],
        data_displayed=[
            "Personalized exercises based on your metrics",
            "AI-calculated optimal weight for each exercise",
            "Set and rep recommendations",
            "Rest periods between sets",
            "Estimated workout duration",
            "Muscle groups targeted",
            "Equipment requirements",
        ],
        usage_tips=[
            "Fill in your profile details (age, weight, height, activity level)",
            "Select target muscles you want to focus on",
            "Choose available equipment at your gym",
            "Click 'Generate Workout' to create personalized plan",
            "AI considers your body composition and goals when recommending exercises",
            "Save successful plans for future reference",
            "Can generate custom plans for different body parts",
        ],
    ),

    "exercises": PageDoc(
        name="Exercise Library",
        path="/exercises",
        description="Complete exercise database with instructions, muscle groups, and difficulty levels",
        features=[
            "Search and filter exercises",
            "Filter by muscle group",
            "Filter by equipment type",
            "Difficulty level indicators",
            "Video demonstrations (when available)",
            "Exercise instructions and form tips",
            "Target muscle groups listed",
            "Common mistakes and corrections",
        ],
        data_displayed=[
            "Exercise name and primary muscle target",
            "Secondary muscle groups",
            "Required equipment",
            "Difficulty (beginner, intermediate, advanced)",
            "Video URL for demonstration",
            "Exercise variations",
            "Similar exercises to the current one",
        ],
        usage_tips=[
            "Search for exercises by name or muscle group",
            "Filter by available equipment",
            "Watch video demonstrations to learn proper form",
            "Focus on one muscle group per training day",
            "Progress to harder variations once you master basics",
            "Check secondary muscles to ensure balanced training",
        ],
    ),

    "nutrition": PageDoc(
        name="Nutrition & Meal Planning",
        path="/nutrition",
        description="Comprehensive nutrition tracking with meal plans, macros, and calorie counting",
        features=[
            "Daily meal logging (breakfast, lunch, dinner, snacks)",
            "Macro tracking (protein, carbs, fats)",
            "Calorie counter with daily goals",
            "Meal plan management",
            "Food database with nutritional info",
            "Weekly nutrition reports",
            "Macro distribution recommendations",
        ],
        data_displayed=[
            "Daily calorie intake vs goal",
            "Protein intake vs target",
            "Carbs and fat breakdown",
            "Meals logged today",
            "Weekly average macros",
            "Food items and portions",
            "Nutritional values (calories, protein, carbs, fats)",
        ],
        usage_tips=[
            "Log meals immediately after eating to track accurately",
            "Use the food database search for quick logging",
            "Check your daily macros to hit nutritional goals",
            "Plan meals in advance for better consistency",
            "Protein intake is crucial for muscle building",
            "Adjust portions based on weekly progress and goals",
        ],
    ),

    "inbody": PageDoc(
        name="Body Composition (InBody)",
        path="/inbody",
        description="Detailed body composition analysis and tracking from InBody scanner results",
        features=[
            "Body composition metrics display",
            "Historical comparison and trends",
            "Muscle mass tracking",
            "Body fat percentage analysis",
            "Water percentage and mineral content",
            "Bone mass tracking",
            "BMI and BMR calculations",
            "Segmental body analysis (limbs, torso)",
        ],
        data_displayed=[
            "Current weight and BMI",
            "Muscle mass (total and by segment)",
            "Body fat percentage and total",
            "Water percentage",
            "Bone mineral content",
            "Basal metabolic rate (BMR)",
            "Historical data over time",
            "Trends and progress graphs",
        ],
        usage_tips=[
            "Get InBody scans regularly (weekly or bi-weekly)",
            "Track muscle mass and body fat, not just weight",
            "Compare measurements over weeks to see real progress",
            "Use InBody data to adjust training and nutrition plans",
            "Focus on muscle gain while managing body fat",
            "InBody is more accurate than scales for tracking composition",
        ],
    ),

    "session": PageDoc(
        name="Workout Session",
        path="/session/:id",
        description="Detailed view of a specific workout session with exercise tracking",
        features=[
            "Session date and duration",
            "Exercise list for the session",
            "Set-by-set tracking",
            "Rep and weight logging",
            "Rest period timing",
            "Session notes",
            "Completion status",
            "Session review and stats",
        ],
        data_displayed=[
            "Scheduled exercises for today's session",
            "Your previous performance on each exercise",
            "Sets, reps, and weight completed",
            "Total workout duration",
            "Exercises completed vs remaining",
            "Session difficulty rating",
            "Muscle groups targeted",
        ],
        usage_tips=[
            "View session details before starting workout",
            "Log each set and rep as you complete them",
            "Compare with previous sessions to track progress",
            "Add notes about how you felt or form issues",
            "Mark session complete when finished",
            "Review completed sessions to plan next workout",
        ],
    ),

    "coach_plan": PageDoc(
        name="Coach Plan",
        path="/coach-plan",
        description="Coach-created personalized fitness plans with detailed guidelines",
        features=[
            "Coach-customized workout plans",
            "Muscle group focus and exercises",
            "Progressive overload schedule",
            "Nutrition guidelines",
            "Recovery recommendations",
            "Plan timeline and phases",
            "Milestone tracking",
        ],
        data_displayed=[
            "Plan name and description",
            "Target muscles and split",
            "Exercises per muscle group",
            "Sets, reps, and rest periods",
            "Plan duration (weeks/months)",
            "Progression schedule",
            "Nutrition macros for plan",
            "Rest days",
        ],
        usage_tips=[
            "Follow coach plan consistently for 4-8 weeks",
            "Progressively increase weight as prescribed",
            "Log all workouts to track adherence",
            "Adjust nutrition based on plan recommendations",
            "Ask your coach for modifications if needed",
            "Complete plan phases before moving to next",
        ],
    ),

    "ai_assistant": PageDoc(
        name="AI Fitness Assistant",
        path="/ai-assistant",
        description="Conversational AI that answers fitness questions using your personal data and knowledge base",
        features=[
            "Chat-based fitness Q&A",
            "Personalized recommendations based on your data",
            "Real-time responses to fitness questions",
            "Access to your complete fitness history",
            "Exercise form guidance",
            "Nutrition advice tailored to your goals",
            "Workout programming assistance",
            "Injury prevention tips",
        ],
        data_displayed=[
            "Your complete fitness profile",
            "Historical workout data",
            "Body composition history",
            "Nutrition logs and macros",
            "Current goals and progress",
            "Exercise performance trends",
            "InBody scan results",
        ],
        usage_tips=[
            "Ask specific questions about your fitness journey",
            "Use it to get personalized workout advice",
            "Ask for nutrition guidance based on your goals",
            "Ask about exercise form and technique",
            "Get motivation and progress tracking insights",
            "Ask about how to use other pages and features",
            "The AI has access to ALL your fitness data",
        ],
    ),

    "profile": PageDoc(
        name="User Profile",
        path="/profile",
        description="Personal profile with fitness goals, metrics, and preferences",
        features=[
            "Personal information display",
            "Fitness goals and targets",
            "Current metrics (weight, height, age)",
            "Activity level settings",
            "Account preferences",
            "Fitness data summary",
            "Account settings and privacy",
        ],
        data_displayed=[
            "Full name and age",
            "Height and current weight",
            "Gender and activity level",
            "Primary fitness goal",
            "Account creation date",
            "Premium/subscription status",
            "Total workouts completed",
            "Join date and tenure",
        ],
        usage_tips=[
            "Keep profile information up to date",
            "Update goals as they change",
            "Review metrics monthly to track progress",
            "Adjust activity level as fitness improves",
        ],
    ),

    "settings": PageDoc(
        name="Settings",
        path="/settings",
        description="Application preferences and account management",
        features=[
            "Theme preferences (dark/light mode)",
            "Notification settings",
            "Data privacy settings",
            "Account security",
            "Measurement units (kg/lbs, cm/inches)",
            "Email preferences",
            "Subscription management",
        ],
        data_displayed=[
            "Current theme",
            "Notification preferences",
            "Privacy settings",
            "Language and region",
            "Measurement preferences",
            "Account security options",
        ],
        usage_tips=[
            "Adjust units based on your preference",
            "Enable notifications for workout reminders",
            "Review privacy settings regularly",
            "Update password periodically",
            "Manage subscription from this page",
        ],
    ),

    "chat": PageDoc(
        name="Chat & Messaging",
        path="/chat",
        description="Direct messaging with coaches and community members",
        features=[
            "Real-time messaging",
            "Coach communication",
            "Message notifications",
            "Chat history",
            "File sharing in messages",
            "Typing indicators",
        ],
        data_displayed=[
            "Recent conversations",
            "Coach or member names",
            "Last message preview",
            "Unread message count",
            "Message timestamps",
        ],
        usage_tips=[
            "Use to ask your coach questions",
            "Share progress photos and updates",
            "Get real-time coaching feedback",
            "Keep messages professional and respectful",
        ],
    ),
}


def get_page_documentation(page_name: str) -> Optional[PageDoc]:
    """Get documentation for a specific page."""
    return PAGES_DOCUMENTATION.get(page_name.lower())


def get_all_pages_summary() -> str:
    """Get a summary of all pages for the chatbot context."""
    lines = [
        "# FitMentor Application Pages & Features",
        "",
        "The FitMentor app has the following pages and features:",
        "",
    ]

    for page_key, page in PAGES_DOCUMENTATION.items():
        lines.append(f"## {page.name} ({page.path})")
        lines.append(f"{page.description}")
        lines.append("")

        lines.append("**Key Features:**")
        for feature in page.features:
            lines.append(f"- {feature}")
        lines.append("")

        lines.append("**Data Displayed:**")
        for data in page.data_displayed:
            lines.append(f"- {data}")
        lines.append("")

        lines.append("**Usage Tips:**")
        for tip in page.usage_tips:
            lines.append(f"- {tip}")
        lines.append("")

    return "\n".join(lines)


def format_page_context(page_name: str) -> str:
    """Format documentation for a specific page."""
    page = get_page_documentation(page_name)
    if not page:
        return f"Page '{page_name}' not found in documentation"

    lines = [
        f"# {page.name} Page",
        f"**Path:** {page.path}",
        f"**Description:** {page.description}",
        "",
        "## Features:",
        "\n".join(f"- {f}" for f in page.features),
        "",
        "## What Data is Displayed:",
        "\n".join(f"- {d}" for d in page.data_displayed),
        "",
        "## How to Use:",
        "\n".join(f"- {t}" for t in page.usage_tips),
    ]

    return "\n".join(lines)
