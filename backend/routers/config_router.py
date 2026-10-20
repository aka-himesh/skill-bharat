"""config_router.py — Returns app configuration from .env"""
from fastapi import APIRouter
from config import settings
from adapters.source_registry import get_source_statuses

router = APIRouter(prefix="/api", tags=["config"])

@router.get("/config", summary="Application configuration (public)")
def get_config():
    """Public endpoint — returns app name, tagline, version. No auth required."""
    sources = get_source_statuses()
    labels = ", ".join(f"{source['name']}: {source['status']} ({source['provenance']})" for source in sources)
    configured_live = any(source["status"] in {"LIVE", "CACHED", "STALE"} for source in sources)
    return {
        "app_name": settings.APP_NAME,
        "app_short_name": settings.APP_SHORT_NAME,
        "app_tagline": settings.APP_TAGLINE,
        "version": "1.0.0-phase1",
        "data_status": "mixed" if configured_live else "synthetic-demo",
        "data_status_label": f"External sources — {labels}; dashboard indicators remain synthetic_demo unless sourced otherwise.",
        "source_statuses": sources,
    }
