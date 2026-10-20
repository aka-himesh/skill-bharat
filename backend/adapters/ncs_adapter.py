"""NCS adapter boundary. API details remain unverified pending DGE authorization."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from config import settings
from .external import fetch_json, latest_cache

SOURCE = "live_ncs"
CALIBRATION_FILE = Path(__file__).resolve().parent.parent / "db" / "ncs-calibration.json"


def load_calibrated_fallback(path: Path = CALIBRATION_FILE) -> tuple[list[dict], str]:
    """Load published aggregate shares only when source/date and shares are supplied."""
    try:
        config = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return [], "synthetic_demo"
    source_note = str(config.get("source", "")).strip()
    source_date = str(config.get("source_date", "")).strip()
    state_shares = config.get("state_vacancy_shares") or {}
    sector_shares = config.get("sector_vacancy_shares") or {}
    if not source_note or not source_date or not (state_shares or sector_shares):
        return [], "synthetic_demo"
    rows = []
    for state, share in state_shares.items():
        rows.append({"dimension": "state", "name": state, "vacancy_share": share,
                     "reference_source": source_note, "reference_date": source_date})
    for sector, share in sector_shares.items():
        rows.append({"dimension": "sector", "name": sector, "vacancy_share": share,
                     "reference_source": source_note, "reference_date": source_date})
    return rows, "calibrated_synthetic"


class NCSAdapter:
    """Uses the exact approved URL in configuration; no endpoint path is guessed."""
    def is_configured(self) -> bool:
        return bool(settings.NCS_API_BASE_URL and settings.NCS_API_KEY)

    def fetch_data(self, params: dict[str, Any] | None = None) -> dict:
        if not self.is_configured():
            rows, provenance_name = load_calibrated_fallback()
            return {
                "data": rows,
                "availability": "NOT_CONFIGURED",
                "provenance": {"source": provenance_name, "status": "NOT_CONFIGURED",
                               "fetched_at": None, "from_cache": False,
                               "is_synthetic": True, "stale": False},
                "message": "NCS requires a DGE-approved endpoint and credentials.",
            }

        response = fetch_json(SOURCE, settings.NCS_API_BASE_URL, params,
                              {"Accept": "application/json", "X-API-Key": settings.NCS_API_KEY})
        payload = response.get("data")
        if response.get("error"):
            return {**response, "availability": response["provenance"]["status"]}
        rows = payload.get("data", payload.get("records")) if isinstance(payload, dict) else None
        if not isinstance(rows, list) or not all(_valid_ncs_record(row) for row in rows):
            return {
                "data": None,
                "availability": "ERROR",
                "provenance": {**response["provenance"], "status": "ERROR", "is_synthetic": False},
                "error": {"code": "unverified_schema", "message": "NCS response did not match the documented provisional schema."},
            }
        return {"data": rows, "availability": response["provenance"]["status"],
                "provenance": response["provenance"], "schema_status": "UNVERIFIED"}

    def get_status(self) -> dict:
        configured = self.is_configured()
        cached = latest_cache(SOURCE) if configured else None
        status = ("STALE" if cached["stale"] else "CACHED") if cached else ("ERROR" if configured else "NOT_CONFIGURED")
        return {
            "source": SOURCE, "name": "National Career Service (NCS)", "configured": configured,
            "status": status, "last_fetched_at": cached["fetched_at"] if cached else None,
            "provenance": SOURCE if configured else "synthetic_demo",
            "message": "UNVERIFIED until DGE grants access and confirms endpoint/auth/schema." if configured else "Not configured: obtain DGE approval and add endpoint and key in backend/.env.",
            "schema_status": "UNVERIFIED",
        }


def _valid_ncs_record(row: Any) -> bool:
    if not isinstance(row, dict):
        return False
    return all(isinstance(row.get(field), str) and row[field]
               for field in ("state", "sector")) and isinstance(row.get("vacancy_share"), (int, float))
