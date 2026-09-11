"""
Social data queries.
Handles direct messages, follows, posts, comments, and likes.
"""

from __future__ import annotations

from .base import fetch_table


async def fetch_direct_messages(user_id: str, limit: int = 20) -> list[dict]:
    """Fetch direct messages for a user (sent or received)."""
    return await fetch_table(
        "direct_messages",
        filters={"or": f"(sender_id.eq.{user_id},receiver_id.eq.{user_id})"},
        order="created_at.desc",
        limit=limit,
    )


async def fetch_user_follows(user_id: str, limit: int = 50) -> list[dict]:
    """Fetch follows for a user (following or followed by)."""
    return await fetch_table(
        "user_follows",
        filters={"or": f"(follower_id.eq.{user_id},following_id.eq.{user_id})"},
        order="created_at.desc",
        limit=limit,
    )


async def fetch_user_posts(user_id: str, limit: int = 10) -> list[dict]:
    """Fetch user's posts, most recent first."""
    return await fetch_table(
        "posts",
        filters={"user_id": f"eq.{user_id}"},
        order="created_at.desc",
        limit=limit,
    )


async def fetch_user_post_comments(user_id: str, limit: int = 10) -> list[dict]:
    """Fetch user's post comments, most recent first."""
    return await fetch_table(
        "post_comments",
        filters={"user_id": f"eq.{user_id}"},
        order="created_at.desc",
        limit=limit,
    )


async def fetch_user_post_likes(user_id: str, limit: int = 10) -> list[dict]:
    """Fetch user's post likes, most recent first."""
    return await fetch_table(
        "post_likes",
        filters={"user_id": f"eq.{user_id}"},
        order="created_at.desc",
        limit=limit,
    )
