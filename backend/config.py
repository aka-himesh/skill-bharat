
"""
config.py — Central configuration loader for AI-LMIS backend.

Reads from .env (project root). All application code should import from here.
Changing .env and restarting the server updates all dependent values.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (two levels up from backend/)
_ROOT = Path(__file__).resolve().parent.parent
# backend/.env is the preferred credential file; root .env remains supported for older setups.
load_dotenv(_ROOT / "backend" / ".env", override=False)
load_dotenv(_ROOT / ".env", override=False)


def _optional_int(name: str, default: int, minimum: int = 0) -> int:
    raw = os.getenv(name, str(default)).strip()
    try:
        value = int(raw)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer") from exc
    if value < minimum:
        raise ValueError(f"{name} must be >= {minimum}")
    return value


def _base_url(name: str, default: str = "") -> str:
    value = os.getenv(name, default).strip().rstrip("/")
    if value and not value.startswith(("https://", "http://")):
        raise ValueError(f"{name} must be an http(s) URL")
    return value


class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "AI-LMIS")
    APP_SHORT_NAME: str = os.getenv("APP_SHORT_NAME", "AI-LMIS")
    APP_TAGLINE: str = os.getenv(
        "APP_TAGLINE", "AI-Enabled Labour Market Intelligence System"
    )
    DB_PATH: str = os.getenv("DB_PATH", "backend/data/lmis.db")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    FRONTEND_PORT: int = int(os.getenv("FRONTEND_PORT", "5173"))
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
    ACCESS_PIN: str = os.getenv("ACCESS_PIN", "26246")
    ACCESS_PASSWORD: str = os.getenv("ACCESS_PASSWORD", "zeroone")

    # Optional external source credentials. Values are never logged or returned by APIs.
    MOSPI_API_BASE_URL: str = _base_url("MOSPI_API_BASE_URL", "https://api.mospi.gov.in")
    MOSPI_API_KEY: str = os.getenv("MOSPI_API_KEY", "").strip()
    NCS_API_BASE_URL: str = _base_url("NCS_API_BASE_URL")
    NCS_API_KEY: str = os.getenv("NCS_API_KEY", "").strip()
    DATA_GOV_IN_API_KEY: str = os.getenv("DATA_GOV_IN_API_KEY", os.getenv("DATAGOV_API_KEY", "")).strip()
    EXTERNAL_CACHE_TTL_HOURS: int = _optional_int("EXTERNAL_CACHE_TTL_HOURS", 24, 1)
    EXTERNAL_REQUEST_TIMEOUT_MS: int = _optional_int("EXTERNAL_REQUEST_TIMEOUT_MS", 10000, 100)
    EXTERNAL_MAX_RETRIES: int = _optional_int("EXTERNAL_MAX_RETRIES", 2, 0)

    # Backwards-compatible source aliases.
    DATAGOV_API_KEY: str = DATA_GOV_IN_API_KEY
    ESHRAM_API_KEY: str = os.getenv("ESHRAM_API_KEY", "").strip()

    # ── Live data integration ──────────────────────────────────────────────────
    USE_LIVE_DATA: bool = os.getenv("USE_LIVE_DATA", "true").lower() == "true"

    # data.gov.in / e-Shram
    ESHRAM_RESOURCE_ID: str = os.getenv("ESHRAM_RESOURCE_ID", "").strip()
    DATAGOV_BASE_URL: str = _base_url("DATAGOV_BASE_URL", "https://api.data.gov.in/resource")
    ESHRAM_CACHE_TTL_HOURS: int = int(os.getenv("ESHRAM_CACHE_TTL_HOURS", "24"))

    # News
    NEWS_PROVIDER: str = os.getenv("NEWS_PROVIDER", "rss")
    NEWS_API_KEY: str = os.getenv("NEWS_API_KEY", "")
    NEWS_CACHE_TTL_MINUTES: int = int(os.getenv("NEWS_CACHE_TTL_MINUTES", "30"))
    NEWS_MAX_ITEMS: int = int(os.getenv("NEWS_MAX_ITEMS", "12"))
    NEWS_MIN_SCORE: int = int(os.getenv("NEWS_MIN_SCORE", "1"))

    # Resolved absolute DB path
    @property
    def DB_URL(self) -> str:
        if os.getenv("VERCEL"):
            tmp_db = Path("/tmp/lmis.db")
            if not tmp_db.exists() or tmp_db.stat().st_size == 0:
                cur = Path(__file__).resolve().parent
                candidates = [
                    cur / "data" / "lmis.db",
                    cur.parent / "backend" / "data" / "lmis.db",
                    cur.parent / "data" / "lmis.db",
                    Path.cwd() / "backend" / "data" / "lmis.db",
                    Path.cwd() / "data" / "lmis.db",
                    Path("/var/task/backend/data/lmis.db"),
                    Path("/var/task/data/lmis.db"),
                ]
                copied = False
                for cand in candidates:
                    if cand.is_file() and cand.stat().st_size > 0:
                        import shutil
                        tmp_db.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(cand, tmp_db)
                        copied = True
                        break
                if not copied:
                    for s_root in [cur, cur.parent, Path.cwd(), Path("/var/task")]:
                        if s_root.exists():
                            for found in s_root.glob("**/lmis.db"):
                                if found.is_file() and found.stat().st_size > 0 and found != tmp_db:
                                    import shutil
                                    tmp_db.parent.mkdir(parents=True, exist_ok=True)
                                    shutil.copy2(found, tmp_db)
                                    copied = True
                                    break
                        if copied:
                            break
            return f"sqlite:///{tmp_db.as_posix()}"

        p = Path(self.DB_PATH)
        if not p.is_absolute():
            p = _ROOT / p
        p.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{p}"

    @property
    def eshram_live_ready(self) -> bool:
        """True if we can attempt a live e-Shram fetch."""
        return bool(self.DATA_GOV_IN_API_KEY and self.ESHRAM_RESOURCE_ID and self.USE_LIVE_DATA)

    @property
    def news_live_ready(self) -> bool:
        """True if live news fetching should be attempted."""
        return self.USE_LIVE_DATA


settings = Settings()
