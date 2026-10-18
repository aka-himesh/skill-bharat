"""sources_router.py — Data source status and methodology endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from connectors.plfs_connector import PLFSConnector
from connectors.ncs_connector import NCSConnector
from connectors.eshram_connector import EShramConnector
from connectors.training_connector import TrainingConnector
from connectors.job_portal_connector import JobPortalConnector

router = APIRouter(prefix="/api", tags=["sources"])

_connectors = [
    PLFSConnector(),
    NCSConnector(),
    EShramConnector(),
    TrainingConnector(),
    JobPortalConnector(),
]


@router.get("/sources/status", summary="Connector status for all data sources")
def sources_status(_=Depends(get_current_user)):
    return {
        "total": len(_connectors),
        "sources": [c.get_status() for c in _connectors],
        "note": (
            "All sources currently in mock/stub mode. "
            "See docs/METHODOLOGY.md for real-integration instructions."
        ),
    }


@router.get("/sources/metadata", summary="Metadata for all data sources")
def sources_metadata(_=Depends(get_current_user)):
    return {"sources": [c.get_metadata() for c in _connectors]}


@router.get("/methodology", summary="Pipeline methodology summary")
def methodology(_=Depends(get_current_user)):
    return {
        "title": "AI-LMIS Methodology Summary",
        "version": "1.0.0-phase1",
        "full_doc": "docs/METHODOLOGY.md",
        "pipeline_steps": [
            {
                "step": 1, "name": "Source Adapters",
                "description": "Mock/stub connectors for PLFS, NCS, e-Shram, Job Portal, Training data.",
                "file": "backend/connectors/",
            },
            {
                "step": 2, "name": "Demand Index",
                "description": (
                    "Weighted composite of 5 sources. "
                    "Weights: job_portal=0.30, ncs=0.25, industry_hiring=0.20, eshram=0.15, plfs=0.10. "
                    "Winsorized, min-max normalized, recency-weighted."
                ),
                "file": "backend/pipeline/demand_index.py",
            },
            {
                "step": 3, "name": "Forecasting",
                "description": (
                    "ETS/Holt-Winters for series >= 18 months, seasonal naive otherwise. "
                    "12-month horizon, 80% prediction intervals, holdout validation."
                ),
                "file": "backend/pipeline/forecasting.py",
            },
            {
                "step": 4, "name": "Gap Analysis",
                "description": (
                    "gap_pct = (demand - supply) / max(demand, 1e-6). "
                    "Bands: Critical Shortage (>0.5), Shortage (>0.2), Balanced, Oversupply (<-0.2), Critical Oversupply (<-0.5)."
                ),
                "file": "backend/pipeline/gap_analysis.py",
            },
            {
                "step": 5, "name": "Alerts",
                "description": "4 configurable rules: sustained growth, capacity excess, approaching shortage/oversupply.",
                "file": "backend/pipeline/alerts.py",
            },
            {
                "step": 6, "name": "Recommendations",
                "description": "Deterministic rule-based seat increase/decrease/reallocation/new course suggestions.",
                "file": "backend/pipeline/recommendations.py",
            },
        ],
        "data_status": "synthetic-demo",
        "disclaimer": (
            "All outputs based on synthetic demonstration data. "
            "Not for policy use without replacement by validated official sources."
        ),
    }
