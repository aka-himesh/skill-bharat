"""Generic paginated client for data.gov.in resource endpoints."""
from __future__ import annotations

from typing import Any

from config import settings
from .external import fetch_json, latest_cache

SOURCE = "live_datagov"


class DataGovInAdapter:
    def is_configured(self) -> bool:
        return bool(settings.DATA_GOV_IN_API_KEY)

    def fetch_data(self, resource_id: str, filters: dict[str, Any] | None = None,
                   limit: int = 1000, max_pages: int = 50) -> dict:
        if not self.is_configured():
            return _not_configured("Add DATA_GOV_IN_API_KEY to backend/.env.")
        if not resource_id or not resource_id.strip():
            return _not_configured("A data.gov.in resource_id is required for this request.")
        if limit < 1 or max_pages < 1:
            return _input_error("limit and max_pages must be positive integers.")

        url = f"{settings.DATAGOV_BASE_URL.rstrip('/')}/{resource_id.strip()}"
        all_rows: list[dict] = []
        last_provenance: dict | None = None
        for page in range(max_pages):
            offset = page * limit
            params = {"api-key": settings.DATA_GOV_IN_API_KEY, "format": "json",
                      "limit": limit, "offset": offset, **(filters or {})}
            result = fetch_json(SOURCE, url, params, {"Accept": "application/json"})
            last_provenance = result.get("provenance")
            if result.get("error") or result.get("data") is None:
                if all_rows and last_provenance and last_provenance.get("stale"):
                    break
                return result
            payload = result["data"]
            page_rows = payload.get("records", payload.get("data", [])) if isinstance(payload, dict) else None
            if not isinstance(page_rows, list):
                return _schema_error("data.gov.in response has no records array.", last_provenance)
            all_rows.extend(page_rows)
            total = payload.get("total", payload.get("count")) if isinstance(payload, dict) else None
            if len(page_rows) < limit or (total is not None and offset + len(page_rows) >= int(total)):
                break

        return {"data": all_rows,
                "provenance": last_provenance or _provenance("ERROR"),
                "availability": (last_provenance or {}).get("status", "ERROR")}

    def get_status(self, resource_id: str | None = None) -> dict:
        configured = self.is_configured()
        has_resource = bool(resource_id or settings.ESHRAM_RESOURCE_ID)
        cached = latest_cache(SOURCE) if configured else None
        complete = configured and has_resource
        status = ("STALE" if cached["stale"] else "CACHED") if cached else ("ERROR" if complete else "NOT_CONFIGURED")
        return {
            "source": SOURCE, "name": "data.gov.in", "configured": complete,
            "status": status, "last_fetched_at": cached["fetched_at"] if cached else None,
            "provenance": SOURCE if complete else "synthetic_demo",
            "message": "Ready for a configured resource request." if complete else "Not configured: add a data.gov.in key and resource ID in backend/.env.",
        }


def _provenance(status: str) -> dict:
    return {"source": SOURCE, "status": status, "fetched_at": None,
            "from_cache": False, "is_synthetic": False, "stale": False}


def _not_configured(message: str) -> dict:
    return {"data": None, "availability": "NOT_CONFIGURED",
            "provenance": {**_provenance("NOT_CONFIGURED"), "source": "synthetic_demo", "is_synthetic": True},
            "message": message}


def _input_error(message: str) -> dict:
    return {"data": None, "availability": "ERROR", "provenance": _provenance("ERROR"),
            "error": {"code": "invalid_request", "message": message}}


def _schema_error(message: str, provenance: dict | None) -> dict:
    return {"data": None, "availability": "ERROR", "provenance": provenance or _provenance("ERROR"),
            "error": {"code": "invalid_response", "message": message}}
