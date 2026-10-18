"""forecast_router.py — Forecast series endpoint."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["forecast"])


@router.get("/forecast", summary="Demand and supply forecast for a district-occupation pair")
def get_forecast(
    district_id: int = Query(..., description="District ID"),
    occupation_id: int = Query(..., description="Occupation ID"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    # Historical demand index
    history = db.execute(text("""
        SELECT month, index_value FROM demand_index
        WHERE district_id=:did AND occupation_id=:oid
        ORDER BY month
    """), {"did": district_id, "oid": occupation_id}).fetchall()

    # Forecast (demand + supply)
    forecasts = db.execute(text("""
        SELECT forecast_type, target_month, point_forecast,
               lower_80, upper_80, model_name, model_params
        FROM forecasts
        WHERE district_id=:did AND occupation_id=:oid
        ORDER BY forecast_type, target_month
    """), {"did": district_id, "oid": occupation_id}).fetchall()

    if not forecasts:
        raise HTTPException(404, "No forecast found. Run the pipeline first.")

    # Latest forecast run info
    run_info = db.execute(text("""
        SELECT run_date, model_used, horizon_months, evaluation_mae, notes
        FROM forecast_runs ORDER BY id DESC LIMIT 1
    """)).fetchone()

    # District and occupation names
    meta = db.execute(text("""
        SELECT d.name, st.name, o.name, o.nco_code
        FROM districts d
        JOIN states st ON d.state_id=st.id
        JOIN occupations o ON o.id=:oid
        WHERE d.id=:did
    """), {"did": district_id, "oid": occupation_id}).fetchone()

    demand_fc = [
        {"month": r[1], "point": r[2], "lower_80": r[3], "upper_80": r[4],
         "model": r[5], "notes": r[6]}
        for r in forecasts if r[0] == "demand"
    ]
    supply_fc = [
        {"month": r[1], "point": r[2], "lower_80": r[3], "upper_80": r[4],
         "model": r[5], "notes": r[6]}
        for r in forecasts if r[0] == "supply"
    ]

    return {
        "district_id": district_id,
        "occupation_id": occupation_id,
        "district_name": meta[0] if meta else None,
        "state_name": meta[1] if meta else None,
        "occupation_name": meta[2] if meta else None,
        "nco_code": meta[3] if meta else None,
        "history": [{"month": r[0], "demand_index": r[1]} for r in history],
        "demand_forecast": demand_fc,
        "supply_forecast": supply_fc,
        "run_info": {
            "run_date": str(run_info[0]) if run_info else None,
            "model": run_info[1] if run_info else None,
            "horizon_months": run_info[2] if run_info else 12,
            "evaluation_mae": run_info[3] if run_info else None,
            "notes": run_info[4] if run_info else None,
        } if run_info else None,
        "data_status": "synthetic-demo",
        "limitation": (
            "All forecasts based on synthetic data. "
            "Prediction intervals shown where the model supports estimation; "
            "null values indicate unavailable intervals, not zero uncertainty."
        ),
    }


@router.get("/trend", summary="Demand trend series for a district-occupation pair")
def get_trend(
    district_id: int = Query(...),
    occupation_id: int = Query(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    rows = db.execute(text("""
        SELECT month, index_value, contributing_sources, weights_used
        FROM demand_index
        WHERE district_id=:did AND occupation_id=:oid
        ORDER BY month
    """), {"did": district_id, "oid": occupation_id}).fetchall()

    return {
        "district_id": district_id,
        "occupation_id": occupation_id,
        "data_status": "synthetic-demo",
        "series": [
            {"month": r[0], "index_value": r[1],
             "contributing_sources": r[2], "weights_used": r[3]}
            for r in rows
        ],
    }
