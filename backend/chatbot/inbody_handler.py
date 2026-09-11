"""
InBody Results Handler
Saves InBody scan results to the Supabase inbody_results table.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from supabase_client import SUPABASE_URL, get_http_client, headers

logger = logging.getLogger(__name__)
router = APIRouter()


class SaveInBodyResultRequest(BaseModel):
    user_id: str | None = None
    result: dict[str, Any] = Field(..., description="InBody data saved as JSONB")
    raw_path: str = Field(default="", description="Unique source/path of the InBody scan")


class SupabaseInsertError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


async def save_inbody_result_to_db(
    user_id: str | None,
    result_data: dict[str, Any],
    raw_path: str = "",
) -> dict[str, Any]:
    if not isinstance(result_data, dict):
        raise ValueError(f"Invalid result_data type: {type(result_data)}")

    payload = {
        "user_id": user_id,
        "raw_path": raw_path or f"inbody_scan_{user_id or 'anonymous'}_{datetime.now(timezone.utc).timestamp()}",
        "result": result_data,
    }

    res = await get_http_client().post(
        f"{SUPABASE_URL}/rest/v1/inbody_results",
        headers={**headers(), "Prefer": "return=representation"},
        json=payload,
    )

    if res.status_code not in (200, 201):
        detail = res.text[:1000] or "Supabase insert failed with empty response"
        logger.error("[InBody] Supabase insert failed: %s %s", res.status_code, detail)
        raise SupabaseInsertError(res.status_code, detail)

    try:
        data = res.json()
    except Exception as exc:
        raise SupabaseInsertError(502, f"Invalid Supabase JSON response: {res.text[:500]}") from exc

    if isinstance(data, list) and data:
        return data[0]
    if isinstance(data, dict):
        return data
    raise SupabaseInsertError(502, "Supabase insert succeeded but returned no saved row")


@router.post("/save-result")
async def save_inbody_result(req: SaveInBodyResultRequest):
    if not req.result:
        raise HTTPException(status_code=400, detail="result is required")

    required_alias_groups = [
        ("weight_kg",),
        ("muscle_mass_kg", "smm_kg"),
        ("body_fat_percentage", "pbf_percent"),
    ]
    missing = [
        " or ".join(group)
        for group in required_alias_groups
        if not any(field in req.result for field in group)
    ]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required fields: {missing}")

    try:
        saved = await save_inbody_result_to_db(req.user_id, req.result, req.raw_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SupabaseInsertError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    except Exception as exc:
        logger.exception("[InBody] Unexpected save error")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "status": "success",
        "message": "InBody result saved successfully",
        "id": saved.get("id"),
        "created_at": saved.get("created_at"),
    }


@router.get("/results/{user_id}")
async def get_user_inbody_results(user_id: str, limit: int = 100):
    res = await get_http_client().get(
        f"{SUPABASE_URL}/rest/v1/inbody_results",
        headers=headers(),
        params={
            "select": "*",
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
            "limit": str(limit),
        },
    )
    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail="Failed to fetch InBody results")

    results = res.json()
    return {"user_id": user_id, "count": len(results), "results": results}


@router.get("/latest/{user_id}")
async def get_latest_inbody_result(user_id: str):
    res = await get_http_client().get(
        f"{SUPABASE_URL}/rest/v1/inbody_results",
        headers=headers(),
        params={
            "select": "*",
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
            "limit": "1",
        },
    )
    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail="Failed to fetch InBody result")

    results = res.json()
    if not results:
        raise HTTPException(status_code=404, detail="No InBody results found")
    return {"user_id": user_id, "latest_result": results[0]}
