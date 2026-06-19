"""
Supabase HTTP client setup and core REST utilities.
All other services depend on these primitives.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_TIMEOUT = float(os.getenv("SUPABASE_TIMEOUT_SECONDS", "8"))

if not SUPABASE_URL:
    print(f"[WARNING] SUPABASE_URL is empty!")
    print(f"[DEBUG] os.environ keys: {list(os.environ.keys())[:10]}")
else:
    print(f"[DEBUG] SUPABASE_URL loaded: {SUPABASE_URL[:50]}...")

logger = logging.getLogger(__name__)
_http_client: httpx.AsyncClient | None = None

DEFAULT_LIMIT = int(os.getenv("SUPABASE_DEFAULT_LIMIT", "10"))
LIBRARY_LIMIT = int(os.getenv("SUPABASE_LIBRARY_LIMIT", "200"))


def headers() -> dict[str, str]:
    """Build standard Supabase API headers."""
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }


def get_http_client() -> httpx.AsyncClient:
    """Reuse connections across Supabase requests instead of reconnecting per table."""
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(SUPABASE_TIMEOUT, connect=3.0),
            limits=httpx.Limits(max_connections=30, max_keepalive_connections=15),
        )
    return _http_client


async def close_http_client() -> None:
    """Close and reset the global HTTP client."""
    global _http_client
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None


async def supabase_get(table: str, params: dict[str, str]) -> httpx.Response:
    """Execute GET request to Supabase REST API."""
    client = get_http_client()
    return await client.get(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=headers(),
        params=params,
    )


async def supabase_post(table: str, payload: dict, params: Optional[dict[str, str]] = None) -> httpx.Response:
    """Execute POST request to Supabase REST API."""
    client = get_http_client()
    request_headers = {**headers(), "Prefer": "return=representation"}
    return await client.post(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=request_headers,
        params=params or {"select": "*"},
        json=payload,
    )


async def supabase_patch(
    table: str,
    *,
    filters: dict[str, str],
    payload: dict,
    params: Optional[dict[str, str]] = None,
) -> httpx.Response:
    """Execute PATCH request to Supabase REST API."""
    client = get_http_client()
    request_headers = {**headers(), "Prefer": "return=representation"}
    request_params = {**filters, **(params or {"select": "*"})}
    return await client.patch(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=request_headers,
        params=request_params,
        json=payload,
    )


async def supabase_delete(table: str, *, filters: dict[str, str]) -> httpx.Response:
    """Execute DELETE request to Supabase REST API."""
    client = get_http_client()
    return await client.delete(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=headers(),
        params=filters,
    )


async def fetch_table(
    table: str,
    *,
    filters: Optional[dict[str, str]] = None,
    select: str = "*",
    order: Optional[str] = None,
    limit: Optional[int | str] = DEFAULT_LIMIT,
) -> list[dict]:
    """Generic safe reader for any Supabase REST table."""
    params: dict[str, str] = {"select": select}
    if filters:
        params.update(filters)
    if order:
        params["order"] = order
    if limit is not None:
        params["limit"] = str(limit)

    res = await supabase_get(table, params)
    return _json_list(res)


async def fetch_table_first(
    table: str,
    *,
    filters: Optional[dict[str, str]] = None,
    select: str = "*",
    order: Optional[str] = None,
) -> Optional[dict]:
    """Fetch first row from table, or None if not found."""
    rows = await fetch_table(table, filters=filters, select=select, order=order, limit=1)
    return rows[0] if rows else None


async def fetch_table_first_by_id(table: str, id_value: str, id_column: str = "id") -> Optional[dict]:
    """Fetch first row from table by ID column."""
    return await fetch_table_first(table, filters={id_column: f"eq.{id_value}"})


def _json_list(res: httpx.Response) -> list[dict]:
    """Parse JSON response as list, with fallback error handling."""
    if res.status_code != 200:
        logger.warning("[Supabase] %s %s", res.status_code, res.text[:200])
        return []
    try:
        data = res.json()
    except Exception:
        logger.warning("[Supabase] Invalid JSON response")
        return []
    return data if isinstance(data, list) else []


def _first(res: httpx.Response) -> Optional[dict]:
    """Parse JSON response and return first item, or None if empty."""
    data = _json_list(res)
    return data[0] if data else None
