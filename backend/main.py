"""
main.py — FastAPI application entry point for AI-LMIS.

Authentication: All /api/* routes require JWT except /api/config and /api/auth/*.
CORS: Enabled for configured frontend port.
Startup: Initialises DB and runs seed if DB is empty.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        f"{settings.APP_TAGLINE} — SIH 2026 Prototype. "
        "All data is synthetic demonstration data unless explicitly labelled as official."
    ),
    version="1.0.0-phase1",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{settings.FRONTEND_PORT}",
        f"http://127.0.0.1:{settings.FRONTEND_PORT}",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
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


# ─── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    """Initialize DB; auto-seed if empty."""
    init_db()
    db = SessionLocal()
    try:
        from sqlalchemy import text
        count = db.execute(text("SELECT COUNT(*) FROM states")).scalar()
        if count == 0:
            print("[startup] DB is empty — running seed generator...")
            from seed.generate import run as seed_run
            seed_run()
            print("[startup] Seed complete. Running pipeline...")
            from pipeline.run import run_pipeline
            run_pipeline()
        else:
            print(f"[startup] DB already has {count} state(s). Skipping seed.")
    except Exception as e:
        print(f"[startup] Warning: {e}")
    finally:
        db.close()


@app.get("/", include_in_schema=False)
def root():
    return {
        "app": settings.APP_NAME,
        "tagline": settings.APP_TAGLINE,
        "version": "1.0.0-phase1",
        "docs": "/api/docs",
        "status": "running",
    }


@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}
