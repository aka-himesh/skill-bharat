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
    # Connector credentials (empty until real integrations are authorized)
    NCS_API_KEY: str = os.getenv("NCS_API_KEY", "")
    ESHRAM_API_KEY: str = os.getenv("ESHRAM_API_KEY", "")
    MOSPI_API_KEY: str = os.getenv("MOSPI_API_KEY", "")
    # Resolved absolute DB path
    @property
    def DB_URL(self) -> str:
        p = Path(self.DB_PATH)
        if not p.is_absolute():
            p = _ROOT / p
        p.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{p}"


settings = Settings()
