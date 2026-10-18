"""config_router.py — Returns app configuration from .env"""
from fastapi import APIRouter
from config import settings

router = APIRouter(prefix="/api", tags=["config"])

@router.get("/config", summary="Application configuration (public)")
def get_config():
    """Public endpoint — returns app name, tagline, version. No auth required."""
    return {
        "app_name": settings.APP_NAME,
        "app_short_name": settings.APP_SHORT_NAME,
        "app_tagline": settings.APP_TAGLINE,
        "version": "1.0.0-phase1",
        "data_status": "synthetic-demo",
        "data_status_label": "Demo data — synthetic",
    }
