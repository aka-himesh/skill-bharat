"""summary_router.py — Dashboard summary KPI counts."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["summary"])


@router.get("/summary", summary="Aggregate KPI counts for the dashboard")
def get_summary(
    state_id: int = Query(None),
    district_id: int = Query(None),
    sector_id: int = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    params = {}
    d_clause = "1=1"
    if district_id:
        d_clause = "d.id = :district_id"
        params["district_id"] = district_id
    elif state_id:
        d_clause = "d.state_id = :state_id"
        params["state_id"] = state_id

    o_clause = "1=1"
    if sector_id:
        o_clause = "o.sector_id = :sector_id"
        params["sector_id"] = sector_id

    def scalar(q):
        return db.execute(text(q), params).scalar() or 0

    states_count = 1 if state_id else scalar("SELECT COUNT(*) FROM states")
    districts_count = 1 if district_id else scalar(f"SELECT COUNT(*) FROM districts d WHERE {d_clause}")
    sectors_count = 1 if sector_id else scalar("SELECT COUNT(*) FROM sectors")
    occupations_count = scalar(f"SELECT COUNT(*) FROM occupations o WHERE {o_clause}")

    crit_q = f"""
        SELECT COUNT(DISTINCT gs.district_id||'_'||gs.occupation_id)
        FROM gap_scores gs
        JOIN districts d ON gs.district_id = d.id
        JOIN occupations o ON gs.occupation_id = o.id
        WHERE gs.gap_band='Critical Shortage' AND {d_clause} AND {o_clause}
    """
    over_q = f"""
        SELECT COUNT(DISTINCT gs.district_id||'_'||gs.occupation_id)
        FROM gap_scores gs
        JOIN districts d ON gs.district_id = d.id
        JOIN occupations o ON gs.occupation_id = o.id
        WHERE gs.gap_band IN ('Oversupply','Critical Oversupply') AND {d_clause} AND {o_clause}
    """
    alerts_q = f"""
        SELECT COUNT(*) FROM alerts a
        JOIN districts d ON a.district_id = d.id
        JOIN occupations o ON a.occupation_id = o.id
        WHERE a.acknowledged=0 AND {d_clause} AND {o_clause}
    """
    recs_q = f"""
        SELECT COUNT(*) FROM recommendations r
        JOIN districts d ON r.district_id = d.id
        JOIN occupations o ON r.occupation_id = o.id
        WHERE {d_clause} AND {o_clause}
    """

    return {
        "states":                  states_count,
        "districts":               districts_count,
        "sectors":                 sectors_count,
        "occupations":             occupations_count,
        "training_centres":        scalar(f"SELECT COUNT(*) FROM training_centres tc JOIN districts d ON tc.district_id=d.id WHERE tc.active=1 AND {d_clause}"),
        "critical_shortage_count": scalar(crit_q),
        "oversupply_count":        scalar(over_q),
        "open_alerts":             scalar(alerts_q),
        "total_recommendations":   scalar(recs_q),
        "suggested_seat_increases": scalar(f"SELECT COALESCE(SUM(r.estimated_seat_change),0) FROM recommendations r JOIN districts d ON r.district_id=d.id JOIN occupations o ON r.occupation_id=o.id WHERE r.action_type='increase_seats' AND {d_clause} AND {o_clause}"),
        "suggested_seat_reductions": scalar(f"SELECT COALESCE(SUM(ABS(r.estimated_seat_change)),0) FROM recommendations r JOIN districts d ON r.district_id=d.id JOIN occupations o ON r.occupation_id=o.id WHERE r.action_type='reduce_seats' AND {d_clause} AND {o_clause}"),
        "data_status": "synthetic-demo",
        "data_status_label": "Demo data — synthetic",
        "pilot_note": "Covers 4 pilot states: UP, MH, TN, MP",
    }
