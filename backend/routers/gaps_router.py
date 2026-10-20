"""gaps_router.py — Gap analysis query, ranking and export endpoints."""
import csv
import io
import json
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api", tags=["gaps"])

VALID_LEVELS = {"national", "state", "district"}
VALID_TYPES  = {"shortage", "oversupply"}


def _build_gaps_query(level, state_id, district_id, sector_id, occupation_id, horizon, nsqf_level=None, is_aspirational=None, limit=500):
    conditions = ["1=1"]
    params = {}
    if district_id:
        conditions.append("gs.district_id=:district_id")
        params["district_id"] = district_id
    elif state_id:
        # Apply state filter at any level — national overview filtered to one state is valid
        conditions.append("d.state_id=:state_id")
        params["state_id"] = state_id
    if sector_id:
        conditions.append("o.sector_id=:sector_id")
        params["sector_id"] = sector_id
    if occupation_id:
        conditions.append("gs.occupation_id=:occupation_id")
        params["occupation_id"] = occupation_id
    if nsqf_level is not None:
        conditions.append("o.nsqf_level=:nsqf_level")
        params["nsqf_level"] = nsqf_level
    if is_aspirational is not None and is_aspirational:
        conditions.append("d.is_aspirational=1")

    where = " AND ".join(conditions)
    sql = f"""
        SELECT gs.district_id, gs.occupation_id, gs.month,
               gs.gap_pct, gs.gap_band, gs.severity_score,
               gs.forecast_demand, gs.forecast_supply,
               gs.is_synthetic,
               d.name as district_name, st.name as state_name,
               o.name as occupation_name, o.nco_code,
               sec.name as sector_name,
               COALESCE(o.nsqf_level, 0) as nsqf_level,
               COALESCE(d.is_aspirational, 0) as is_aspirational,
               d.state_id as state_id
        FROM gap_scores gs
        JOIN districts d   ON gs.district_id   = d.id
        JOIN states   st   ON d.state_id        = st.id
        JOIN occupations o ON gs.occupation_id  = o.id
        LEFT JOIN sectors sec ON o.sector_id    = sec.id
        WHERE {where}
        ORDER BY gs.severity_score DESC, gs.month DESC
        LIMIT {limit}
    """
    return sql, params



@router.get("/gaps", summary="Demand-supply gap scores with filters")
def get_gaps(
    level: str = Query("national", enum=["national", "state", "district"]),
    state_id: int = Query(None),
    district_id: int = Query(None),
    sector_id: int = Query(None),
    occupation_id: int = Query(None),
    nsqf_level: int = Query(None),
    is_aspirational: bool = Query(None),
    horizon: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    sql, params = _build_gaps_query(level, state_id, district_id, sector_id, occupation_id, horizon, nsqf_level, is_aspirational)
    rows = db.execute(text(sql), params).fetchall()
    return {
        "count": len(rows),
        "data_status": "synthetic-demo",
        "gaps": [
            {
                "district_id": r[0], "occupation_id": r[1], "month": r[2],
                "gap_pct": r[3], "gap_band": r[4], "severity_score": r[5],
                "forecast_demand": r[6], "forecast_supply": r[7],
                "is_synthetic": bool(r[8]),
                "district_name": r[9], "state_name": r[10],
                "occupation_name": r[11], "nco_code": r[12],
                "sector_name": r[13],
                "nsqf_level": r[14],
                "is_aspirational": bool(r[15]),
                "state_id": r[16],
            }
            for r in rows
        ],
    }


@router.get("/ranking", summary="Top shortage or oversupply district-occupation pairs")
def get_ranking(
    type: str = Query("shortage", enum=["shortage", "oversupply"]),
    limit: int = Query(10, ge=1, le=50),
    state_id: int = Query(None),
    district_id: int = Query(None),
    sector_id: int = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    if type == "shortage":
        band_filter = "gs.gap_band IN ('Critical Shortage','Shortage')"
        order = "gs.gap_pct DESC"
    else:
        band_filter = "gs.gap_band IN ('Oversupply','Critical Oversupply')"
        order = "gs.gap_pct ASC"

    extra_clauses = []
    params = {"lim": limit}
    if state_id:
        extra_clauses.append("d.state_id=:state_id")
        params["state_id"] = state_id
    if district_id:
        extra_clauses.append("d.id=:district_id")
        params["district_id"] = district_id
    if sector_id:
        extra_clauses.append("o.sector_id=:sector_id")
        params["sector_id"] = sector_id

    where_extra = ("AND " + " AND ".join(extra_clauses)) if extra_clauses else ""

    sql = f"""
        SELECT gs.district_id, gs.occupation_id,
               MAX(gs.severity_score) as max_sev,
               AVG(gs.gap_pct) as avg_gap,
               gs.gap_band,
               d.name as district_name, st.name as state_name,
               o.name as occupation_name, o.nco_code,
               sec.name as sector_name
        FROM gap_scores gs
        JOIN districts d   ON gs.district_id  = d.id
        JOIN states   st   ON d.state_id       = st.id
        JOIN occupations o ON gs.occupation_id = o.id
        LEFT JOIN sectors sec ON o.sector_id   = sec.id
        WHERE {band_filter} {where_extra}
        GROUP BY gs.district_id, gs.occupation_id
        ORDER BY {order}
        LIMIT :lim
    """
    rows = db.execute(text(sql), params).fetchall()
    return {
        "type": type,
        "count": len(rows),
        "data_status": "synthetic-demo",
        "ranking": [
            {
                "district_id": r[0], "occupation_id": r[1],
                "max_severity": r[2], "avg_gap_pct": r[3],
                "gap_band": r[4], "district_name": r[5],
                "state_name": r[6], "occupation_name": r[7],
                "nco_code": r[8], "sector_name": r[9],
            }
            for r in rows
        ],
    }


@router.get("/gaps/export.csv", summary="Export gap analysis as CSV")
def export_gaps_csv(
    state_id: int = Query(None),
    district_id: int = Query(None),
    sector_id: int = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    sql, params = _build_gaps_query("national", state_id, district_id, sector_id, None, 12, limit=10000)
    rows = db.execute(text(sql), params).fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "state_name", "district_name", "occupation_name", "nco_code", "sector_name",
        "month", "gap_pct", "gap_band", "severity_score",
        "forecast_demand", "forecast_supply", "is_synthetic",
        "provenance_note", "generated_at",
    ])
    generated_at = datetime.utcnow().isoformat() + "Z"
    for r in rows:
        writer.writerow([
            r[10], r[9], r[11], r[12], r[13],
            r[2], r[3], r[4], r[5],
            r[6], r[7], bool(r[8]),
            "Synthetic demonstration data — not official statistics",
            generated_at,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=gap_analysis.csv"},
    )


@router.get("/gaps/export.json", summary="Export gap analysis as JSON")
def export_gaps_json(
    state_id: int = Query(None),
    district_id: int = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    sql, params = _build_gaps_query("national", state_id, district_id, None, None, 12, limit=10000)
    rows = db.execute(text(sql), params).fetchall()
    data = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "data_status": "synthetic-demo",
        "provenance_note": "Synthetic demonstration data — not official statistics",
        "count": len(rows),
        "gaps": [
            {
                "state_name": r[10], "district_name": r[9],
                "occupation_name": r[11], "nco_code": r[12],
                "sector_name": r[13], "month": r[2],
                "gap_pct": r[3], "gap_band": r[4],
                "severity_score": r[5],
                "forecast_demand": r[6], "forecast_supply": r[7],
                "is_synthetic": bool(r[8]),
            }
            for r in rows
        ],
    }
    return JSONResponse(content=data)
