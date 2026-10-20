import os
import sys
import traceback

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)

for p in [backend_dir, current_dir, os.getcwd()]:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

try:
    from main import app
except Exception as e:
    import logging
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    err_str = f"{type(e).__name__}: {str(e)}"
    tb = traceback.format_exc()
    logging.error("Fatal startup error in backend/api/index.py: %s\n%s", err_str, tb)

    app = FastAPI(title="Error Diagnostic")

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"])
    async def debug_catch_all(full_path: str = ""):
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "error": "Failed to initialize FastAPI app on Vercel",
                "message": err_str,
                "traceback": tb.splitlines(),
                "sys_path": sys.path,
                "cwd": os.getcwd(),
                "cwd_contents": os.listdir(os.getcwd()) if os.path.exists(os.getcwd()) else [],
            }
        )
