"""alerts_router.py — Alerts listing endpoint."""
import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["alerts"])


@router.get("/alerts", summary="List early warning alerts with optional filters")
def list_alerts(
    severity: str = Query(None, enum=["low", "medium", "high", "critical"]),
    state_id: int = Query(None),
    district_id: int = Query(None),
    sector_id: int = Query(None),
    occupation_id: int = Query(None),
    alert_type: str = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    conditions = ["1=1"]
    params = {"lim": limit}
    if severity:
        conditions.append("a.severity=:severity")
        params["severity"] = severity
    if state_id:
        conditions.append("d.state_id=:state_id")
        params["state_id"] = state_id
    if district_id:
        conditions.append("a.district_id=:district_id")
        params["district_id"] = district_id
    if sector_id:
        conditions.append("o.sector_id=:sector_id")
        params["sector_id"] = sector_id
    if occupation_id:
        conditions.append("a.occupation_id=:occupation_id")
        params["occupation_id"] = occupation_id
    if alert_type:
        conditions.append("a.alert_type=:alert_type")
        params["alert_type"] = alert_type

    where = " AND ".join(conditions)
    rows = db.execute(text(f"""
        SELECT a.id, a.district_id, a.occupation_id, a.alert_type,
               a.severity, a.rule_name, a.rule_description, a.evidence,
               a.reference_period, a.acknowledged, a.created_at,
               d.name as district_name, st.name as state_name,
               o.name as occupation_name, o.nco_code
        FROM alerts a
        JOIN districts d ON a.district_id=d.id
        JOIN states st ON d.state_id=st.id
        JOIN occupations o ON a.occupation_id=o.id
        WHERE {where}
        ORDER BY
          CASE a.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
          a.created_at DESC
        LIMIT :lim
    """), params).fetchall()

    return {
        "count": len(rows),
        "data_status": "synthetic-demo",
        "disclaimer": "Alerts generated from synthetic data. Acknowledgement is UI-local only.",
        "alerts": [
            {
                "id": r[0], "district_id": r[1], "occupation_id": r[2],
                "alert_type": r[3], "severity": r[4],
                "rule_name": r[5], "rule_description": r[6],
                "evidence": r[7], "reference_period": r[8],
                "acknowledged": bool(r[9]), "created_at": str(r[10]),
                "district_name": r[11], "state_name": r[12],
                "occupation_name": r[13], "nco_code": r[14],
            }
            for r in rows
        ],
    }
