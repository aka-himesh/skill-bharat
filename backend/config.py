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
load_dotenv(_ROOT / ".env", override=False)


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

    # Legacy connector credentials
    NCS_API_KEY: str = os.getenv("NCS_API_KEY", "")
    ESHRAM_API_KEY: str = os.getenv("ESHRAM_API_KEY", "")
    MOSPI_API_KEY: str = os.getenv("MOSPI_API_KEY", "")

    # ── Live data integration ──────────────────────────────────────────────────
    USE_LIVE_DATA: bool = os.getenv("USE_LIVE_DATA", "true").lower() == "true"

    # data.gov.in / e-Shram
    DATAGOV_API_KEY: str = os.getenv("DATAGOV_API_KEY", "")
    ESHRAM_RESOURCE_ID: str = os.getenv("ESHRAM_RESOURCE_ID", "")
    DATAGOV_BASE_URL: str = os.getenv(
        "DATAGOV_BASE_URL", "https://api.data.gov.in/resource"
    )
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
        p = Path(self.DB_PATH)
        if not p.is_absolute():
            p = _ROOT / p
        p.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{p}"

    @property
    def eshram_live_ready(self) -> bool:
        """True if we can attempt a live e-Shram fetch."""
        return bool(self.DATAGOV_API_KEY and self.ESHRAM_RESOURCE_ID and self.USE_LIVE_DATA)

    @property
    def news_live_ready(self) -> bool:
        """True if live news fetching should be attempted."""
        return self.USE_LIVE_DATA


settings = Settings()
