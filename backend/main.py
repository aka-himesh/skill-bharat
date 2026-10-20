"""
main.py — FastAPI application entry point for AI-LMIS.

Authentication: All /api/* routes require JWT except /api/config and /api/auth/*.
CORS: Enabled for configured frontend port.
Startup: Initialises DB, seeds if empty, wires e-Shram connector to DB,
         schedules background data refresh.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db, SessionLocal
from auth import router as auth_router
from routers.config_router import router as config_router
from routers.geo_router import router as geo_router
from routers.sectors_router import router as sectors_router
from routers.occupations_router import router as occupations_router
from routers.summary_router import router as summary_router
from routers.gaps_router import router as gaps_router
from routers.forecast_router import router as forecast_router
from routers.alerts_router import router as alerts_router
from routers.recommendations_router import router as recommendations_router
from routers.sources_router import router as sources_router
from routers.eshram_router import router as eshram_router
from routers.news_router import router as news_router
from routers.external_sources_router import router as external_sources_router

logger = logging.getLogger(__name__)


# ── APScheduler background refresh ───────────────────────────────────────────
_scheduler = None


def _start_scheduler():
    """Start APScheduler background jobs for live data refresh."""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from connectors.eshram import eshram_connector
        from services.news_filter import invalidate_cache

        scheduler = BackgroundScheduler(timezone="UTC")

        if settings.eshram_live_ready:
            scheduler.add_job(
                lambda: eshram_connector._fetch_live(),
                "interval",
                hours=settings.ESHRAM_CACHE_TTL_HOURS,
                id="eshram_refresh",
                max_instances=1,
                coalesce=True,
            )
            logger.info(
                "[scheduler] e-Shram refresh every %d hours", settings.ESHRAM_CACHE_TTL_HOURS
            )

        # News cache refresh
        scheduler.add_job(
            invalidate_cache,
            "interval",
            minutes=settings.NEWS_CACHE_TTL_MINUTES,
            id="news_refresh",
            max_instances=1,
            coalesce=True,
        )

        scheduler.start()
        logger.info("[scheduler] APScheduler started.")
        return scheduler
    except Exception as e:
        logger.warning("[scheduler] Could not start APScheduler: %s", e)
        return None


# ── App lifecycle ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB, seed (non-blocking), wire connectors, start scheduler."""
    global _scheduler

    # 1. Create tables synchronously (fast)
    init_db()

    # Report readiness only; never print credential values or request URLs.
    logger.info(
        "[sources] MoSPI=%s NCS=%s data.gov.in=%s",
        "CONFIGURED" if settings.MOSPI_API_BASE_URL else "NOT_CONFIGURED",
        "CONFIGURED" if settings.NCS_API_BASE_URL and settings.NCS_API_KEY else "NOT_CONFIGURED",
        "CONFIGURED" if settings.DATA_GOV_IN_API_KEY and settings.ESHRAM_RESOURCE_ID else "NOT_CONFIGURED",
    )

    # 2. Wire eshram connector to DB session factory immediately
    from connectors.eshram import eshram_connector
    eshram_connector.set_db(SessionLocal)

    is_serverless = bool(os.getenv("VERCEL"))

    if not is_serverless:
        # 3. Run seed + pipeline in a background thread so startup doesn't block (local/server only)
        def _seed_and_pipeline():
            db = SessionLocal()
            try:
                from sqlalchemy import text
                count = db.execute(text("SELECT COUNT(*) FROM states")).scalar()
                if count == 0:
                    logger.info("[startup] DB empty — running seed generator...")
                    from seed.generate import run as seed_run
                    seed_run()
                    logger.info("[startup] Seed complete. Running pipeline...")
                    from pipeline.run import run_pipeline
                    run_pipeline()
                else:
                    logger.info("[startup] DB already has %d state(s).", count)
            except Exception as e:
                logger.warning("[startup] Warning during seed: %s", e)
            finally:
                db.close()

        import threading
        threading.Thread(target=_seed_and_pipeline, daemon=True, name="seed-thread").start()

        # 4. Kick off initial e-Shram fetch in background (non-blocking)
        if settings.eshram_live_ready:
            def _initial_eshram():
                try:
                    data = eshram_connector._fetch_live()
                    logger.info("[startup] Initial e-Shram: %d records", len(data.get("rows", [])))
                except Exception as e:
                    logger.warning("[startup] e-Shram initial fetch failed (%s)", type(e).__name__)
            threading.Thread(target=_initial_eshram, daemon=True, name="eshram-initial").start()

        # 5. Start scheduler
        _scheduler = _start_scheduler()

    yield  # ← app runs here

    if _scheduler:
        _scheduler.shutdown(wait=False)
        logger.info("[shutdown] APScheduler stopped.")


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        f"{settings.APP_TAGLINE} — SIH 2026 Prototype. "
        "All data is synthetic demonstration data unless explicitly labelled as official."
    ),
    version="1.0.0-phase2",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
cors_origins = [
    f"http://localhost:{settings.FRONTEND_PORT}",
    f"http://127.0.0.1:{settings.FRONTEND_PORT}",
    "http://localhost:3000",
    "http://localhost:5173",
]
if os.getenv("VERCEL"):
    cors_origins = ["*"]

@app.middleware("http")
async def normalize_vercel_rewrites(request, call_next):
    """Ensure requests rewritten to /api/index.py or /api/index map to correct FastAPI routes."""
    path = request.scope.get("path", "")
    for prefix in ("/api/index.py", "/api/index"):
        if path.startswith(prefix):
            remainder = path[len(prefix):]
            request.scope["path"] = remainder if remainder.startswith("/") else "/" + remainder
            break
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(config_router)
app.include_router(geo_router)
app.include_router(sectors_router)
app.include_router(occupations_router)
app.include_router(summary_router)
app.include_router(gaps_router)
app.include_router(forecast_router)
app.include_router(alerts_router)
app.include_router(recommendations_router)
app.include_router(sources_router)
app.include_router(eshram_router)
app.include_router(news_router)
app.include_router(external_sources_router)


@app.get("/", include_in_schema=False)
def root():
    return {
        "app": settings.APP_NAME,
        "tagline": settings.APP_TAGLINE,
        "version": "1.0.0-phase2",
        "docs": "/api/docs",
        "status": "running",
        "live_data": settings.USE_LIVE_DATA,
    }


@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.BACKEND_PORT, reload=True)
