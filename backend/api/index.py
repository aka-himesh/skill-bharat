"""
Vercel Serverless Entrypoint for AI-LMIS Backend.
Includes step-by-step diagnostic import to catch the exact crash.
"""
import os
import sys
import traceback
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vercel-entrypoint")

# ── Path setup ────────────────────────────────────────────────────────────────
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)

for p in [backend_dir, current_dir, os.getcwd()]:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

# ── Diagnostic: log environment on first load ─────────────────────────────────
_diag = {
    "cwd": os.getcwd(),
    "current_dir": current_dir,
    "backend_dir": backend_dir,
    "backend_exists": os.path.isdir(backend_dir),
    "sys_path": sys.path[:10],
    "vercel_env": os.getenv("VERCEL", ""),
    "python_version": sys.version,
}

if os.path.isdir(backend_dir):
    _diag["backend_contents"] = sorted(os.listdir(backend_dir))[:30]

# Check if data/lmis.db is available
for candidate in [
    os.path.join(backend_dir, "data", "lmis.db"),
    os.path.join(os.getcwd(), "data", "lmis.db"),
    "/var/task/data/lmis.db",
    "/var/task/backend/data/lmis.db",
]:
    if os.path.isfile(candidate):
        _diag["db_found"] = candidate
        _diag["db_size_mb"] = round(os.path.getsize(candidate) / 1024 / 1024, 2)
        break
else:
    _diag["db_found"] = None

logger.info("Vercel entrypoint diagnostic: %s", json.dumps(_diag, indent=2))

# ── Progressive import ────────────────────────────────────────────────────────
_import_errors = []

def _try_import(step_name, import_fn):
    """Attempt an import step; record failure but keep going."""
    try:
        result = import_fn()
        logger.info("[OK] %s", step_name)
        return result
    except BaseException as e:
        tb = traceback.format_exc()
        logger.error("[FAIL] %s: %s\n%s", step_name, e, tb)
        _import_errors.append({"step": step_name, "error": str(e), "traceback": tb})
        return None

# Step 1: config
_try_import("import config", lambda: __import__("config"))

# Step 2: database
_try_import("import database", lambda: __import__("database"))

# Step 3: models
_try_import("import models", lambda: __import__("models"))

# Step 4: auth
_try_import("import auth", lambda: __import__("auth"))

# Step 5: routers (the big one)
_try_import("import routers.config_router", lambda: __import__("routers.config_router"))
_try_import("import routers.geo_router", lambda: __import__("routers.geo_router"))
_try_import("import routers.sectors_router", lambda: __import__("routers.sectors_router"))
_try_import("import routers.news_router", lambda: __import__("routers.news_router"))
_try_import("import routers.sources_router", lambda: __import__("routers.sources_router"))
_try_import("import routers.eshram_router", lambda: __import__("routers.eshram_router"))
_try_import("import routers.external_sources_router", lambda: __import__("routers.external_sources_router"))

# Step 6: full main
main_mod = _try_import("import main", lambda: __import__("main"))

# ── Create app ────────────────────────────────────────────────────────────────
if main_mod is not None and not _import_errors:
    # All imports succeeded, use the real app
    app = main_mod.app
    logger.info("FastAPI app loaded successfully: %s", app.title)
else:
    # Something failed — create a diagnostic app
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    from fastapi.middleware.cors import CORSMiddleware

    app = FastAPI(title="AI-LMIS Diagnostic")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    async def diagnostic(full_path: str = ""):
        return JSONResponse(
            status_code=500,
            content={
                "status": "startup_failed",
                "message": "FastAPI app could not be loaded. See import_errors for details.",
                "diagnostic": _diag,
                "import_errors": _import_errors,
            },
        )

    logger.error("Using diagnostic fallback app due to %d import error(s)", len(_import_errors))
