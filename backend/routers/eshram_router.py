"""
eshram_router.py — e-Shram live data endpoints.

All endpoints:
  - Require JWT auth (same as existing endpoints).
  - Return {"source": "live"|"cached"|"synthetic", ...} in every response.
  - Fall back gracefully on network/key errors.

POST /api/admin/refresh/eshram — force a cache refresh (demo only, no auth guard).
"""
from fastapi import APIRouter, Depends, Query
from auth import get_current_user
from connectors.eshram import eshram_connector

router = APIRouter(prefix="/api", tags=["eshram"])


@router.get("/eshram/summary", summary="National and state-wise e-Shram registration summary")
def eshram_summary(
    state: str | None = Query(None, description="Filter to a specific state"),
    _=Depends(get_current_user),
):
    """
    Returns:
      - national_total: total registered unorganised workers (all matched districts)
      - state_totals: list of {state, total} sorted by total desc
      - top_districts: top 10 districts by registration count
      - source: "live" | "cached" | "synthetic"
      - snapshot_date: date of the data (YYYY-MM-DD)

    IMPORTANT: Registrations are a SUPPLY-SIDE indicator (workforce size),
    NOT a count of job vacancies.
    """
    return eshram_connector.fetch_summary(state=state)


@router.get("/eshram/districts", summary="District-wise e-Shram registration data")
def eshram_districts(
    state: str | None = Query(None, description="Filter by state name"),
    q: str | None = Query(None, description="Search by district or state name"),
    _=Depends(get_current_user),
):
    """Returns all district rows with demographic breakdown fields."""
    return eshram_connector.fetch_districts(state=state, q=q)


@router.get("/eshram/district/{district}", summary="Demographic breakdown for a single district")
def eshram_district_detail(district: str, _=Depends(get_current_user)):
    """Returns full breakdown for the named district, or 404 if not found."""
    result = eshram_connector.fetch_district_detail(district)
    if result is None:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=404,
            content={"detail": f"District '{district}' not found in e-Shram data."},
        )
    return result


@router.get("/eshram/unmatched", summary="Districts that failed geo-matching")
def eshram_unmatched(_=Depends(get_current_user)):
    """
    Returns districts from the e-Shram dataset whose names could not be
    fuzzy-matched to any canonical district in our DB.
    Useful for maintaining the geo_aliases.json map.
    """
    from database import SessionLocal
    from sqlalchemy import text

    db = SessionLocal()
    try:
        rows = db.execute(text("SELECT DISTINCT name FROM districts")).fetchall()
        canonical = [r[0] for r in rows]
    finally:
        db.close()

    unmatched = eshram_connector.get_unmatched_districts(canonical)
    return {
        "count": len(unmatched),
        "unmatched": unmatched,
        "note": (
            "Add these to backend/config/geo_aliases.json to improve district matching."
        ),
    }


@router.post("/admin/refresh/eshram", include_in_schema=True, summary="Force e-Shram cache refresh (demo only)")
def refresh_eshram():
    """
    Triggers a fresh fetch from data.gov.in and updates the SQLite cache.
    No auth guard — demo use only. Do not expose in production.
    """
    from connectors.eshram import settings as s
    if not s.eshram_live_ready:
        return {
            "status": "skipped",
            "reason": "DATAGOV_API_KEY or ESHRAM_RESOURCE_ID not configured. Using synthetic data.",
        }
    try:
        data = eshram_connector._fetch_live()
        return {
            "status": "refreshed",
            "record_count": len(data["rows"]),
            "snapshot_date": data.get("snapshot_date"),
            "source": data["source"],
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}
