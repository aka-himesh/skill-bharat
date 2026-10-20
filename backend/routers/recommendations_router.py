"""recommendations_router.py — Recommendations listing and CSV export."""
import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["recommendations"])


def _fetch_recs(db, state_id, district_id, sector_id, occupation_id, action_type, limit):
    conditions = ["1=1"]
    params = {"lim": limit}
    if state_id:
        conditions.append("d.state_id=:state_id")
        params["state_id"] = state_id
    if district_id:
        conditions.append("r.district_id=:district_id")
        params["district_id"] = district_id
    if sector_id:
        conditions.append("o.sector_id=:sector_id")
        params["sector_id"] = sector_id
    if occupation_id:
        conditions.append("r.occupation_id=:occupation_id")
        params["occupation_id"] = occupation_id
    if action_type:
        conditions.append("r.action_type=:action_type")
        params["action_type"] = action_type

    where = " AND ".join(conditions)
    return db.execute(text(f"""
        SELECT r.id, r.district_id, r.occupation_id, r.action_type,
               r.description, r.estimated_seat_change, r.evidence,
               r.assumptions, r.confidence_note, r.data_provenance, r.created_at,
               d.name as district_name, st.name as state_name,
               o.name as occupation_name, o.nco_code, sec.name as sector_name
        FROM recommendations r
        JOIN districts d ON r.district_id=d.id
        JOIN states st ON d.state_id=st.id
        JOIN occupations o ON r.occupation_id=o.id
        LEFT JOIN sectors sec ON o.sector_id=sec.id
        WHERE {where}
        ORDER BY ABS(r.estimated_seat_change) DESC
        LIMIT :lim
    """), params).fetchall()


@router.get("/recommendations", summary="List planning recommendations")
def list_recommendations(
    state_id: int = Query(None),
    district_id: int = Query(None),
    sector_id: int = Query(None),
    occupation_id: int = Query(None),
    action_type: str = Query(None, enum=["increase_seats", "reduce_seats", "reallocate", "new_course", "curriculum_review"]),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    rows = _fetch_recs(db, state_id, district_id, sector_id, occupation_id, action_type, limit)
    return {
        "count": len(rows),
        "data_status": "synthetic-demo",
        "disclaimer": (
            "Planning suggestions only. Not approved policy decisions. "
            "Based on synthetic demonstration data."
        ),
        "recommendations": [
            {
                "id": r[0], "district_id": r[1], "occupation_id": r[2],
                "action_type": r[3], "description": r[4],
                "estimated_seat_change": r[5], "evidence": r[6],
                "assumptions": r[7], "confidence_note": r[8],
                "data_provenance": r[9], "created_at": str(r[10]),
                "district_name": r[11], "state_name": r[12],
                "occupation_name": r[13], "nco_code": r[14],
                "sector_name": r[15],
            }
            for r in rows
        ],
    }


@router.get("/recommendations/export.csv", summary="Export recommendations as target-setting CSV")
def export_recommendations_csv(
    state_id: int = Query(None),
    district_id: int = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    rows = _fetch_recs(db, state_id, district_id, None, None, None, 10000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "state_name", "district_name", "occupation_name", "nco_code", "sector_name",
        "action_type", "description", "estimated_seat_change",
        "evidence", "assumptions", "confidence_note", "data_provenance", "generated_at",
    ])
    generated_at = datetime.utcnow().isoformat() + "Z"
    for r in rows:
        writer.writerow([
            r[12], r[11], r[13], r[14], r[15],
            r[3], r[4], r[5],
            r[6], r[7], r[8], r[9], generated_at,
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=recommendations.csv"},
    )
