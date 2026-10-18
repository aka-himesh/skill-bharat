"""summary_router.py — Dashboard summary KPI counts."""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["summary"])


@router.get("/summary", summary="Aggregate KPI counts for the dashboard")
def get_summary(db: Session = Depends(get_db), _=Depends(get_current_user)):
    def scalar(q, params=None):
        return db.execute(text(q), params or {}).scalar() or 0

    return {
        "states":                  scalar("SELECT COUNT(*) FROM states"),
        "districts":               scalar("SELECT COUNT(*) FROM districts"),
        "sectors":                 scalar("SELECT COUNT(*) FROM sectors"),
        "occupations":             scalar("SELECT COUNT(*) FROM occupations"),
        "training_centres":        scalar("SELECT COUNT(*) FROM training_centres WHERE active=1"),
        "critical_shortage_count": scalar("SELECT COUNT(DISTINCT district_id||'_'||occupation_id) FROM gap_scores WHERE gap_band='Critical Shortage'"),
        "oversupply_count":        scalar("SELECT COUNT(DISTINCT district_id||'_'||occupation_id) FROM gap_scores WHERE gap_band IN ('Oversupply','Critical Oversupply')"),
        "open_alerts":             scalar("SELECT COUNT(*) FROM alerts WHERE acknowledged=0"),
        "total_recommendations":   scalar("SELECT COUNT(*) FROM recommendations"),
        "suggested_seat_increases": scalar("SELECT COALESCE(SUM(estimated_seat_change),0) FROM recommendations WHERE action_type='increase_seats'"),
        "suggested_seat_reductions": scalar("SELECT COALESCE(SUM(ABS(estimated_seat_change)),0) FROM recommendations WHERE action_type='reduce_seats'"),
        "data_status": "synthetic-demo",
        "data_status_label": "Demo data — synthetic",
        "pilot_note": "Covers 4 pilot states: UP, MH, TN, MP",
    }
