"""MoSPI e-Sankhyiki PLFS adapter. PLFS rates are contextual, not vacancy counts."""
from __future__ import annotations

from typing import Any
from urllib.parse import urljoin

from config import settings
from .external import fetch_json, latest_cache

SOURCE = "live_mospi"
PLFS_SIGNAL_TYPE = "plfs_employment_trend"


class MospiAdapter:
    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or settings.MOSPI_API_BASE_URL).rstrip("/")

    def _headers(self) -> dict[str, str]:
        # The public PLFS API is keyless; don't send a credential unless MoSPI
        # documents an authentication contract for a protected endpoint.
        return {"Accept": "application/json", "User-Agent": "AI-LMIS/1.0"}

    def _get(self, path: str, params: dict | None = None) -> dict:
        return fetch_json(SOURCE, urljoin(self.base_url + "/", path.lstrip("/")), params, self._headers())

    def get_indicators(self, frequency_code: int = 1) -> dict:
        if frequency_code not in (1, 2, 3):
            return _input_error("frequency_code must be 1 (annual), 2 (quarterly), or 3 (monthly).")
        return self._get("/api/plfs/getIndicatorListByFrequency", {"frequency_code": frequency_code})

    def get_metadata(self, indicator_code: int, frequency_code: int = 1) -> dict:
        if frequency_code not in (1, 2, 3):
            return _input_error("frequency_code must be 1 (annual), 2 (quarterly), or 3 (monthly).")
        return self._get("/api/plfs/getFilterByIndicatorId", {
            "indicator_code": indicator_code, "frequency_code": frequency_code,
        })

    def get_data(self, filters: dict[str, Any]) -> dict:
        if "indicator_code" not in filters or "frequency_code" not in filters:
            return _input_error("PLFS requests require indicator_code and frequency_code.")
        frequency_code = int(filters["frequency_code"])
        if frequency_code not in (1, 2, 3):
            return _input_error("frequency_code must be 1 (annual), 2 (quarterly), or 3 (monthly).")
        return self._get("/api/plfs/getData", filters)

    def fetch_data(self, frequency_codes: tuple[int, ...] = (1, 2),
                   indicator_codes: list[int] | None = None,
                   filters: dict[str, Any] | None = None) -> dict:
        """Discover PLFS indicators and metadata before fetching mapped records."""
        output: list[dict] = []
        provenance: dict | None = None
        errors: list[dict] = []
        for frequency_code in frequency_codes:
            discovered = self.get_indicators(frequency_code)
            provenance = discovered.get("provenance", provenance)
            if discovered.get("error") or discovered.get("data") is None:
                errors.append(discovered.get("error", {"code": "upstream_error", "message": "Indicator discovery failed."}))
                continue
            records = discovered["data"].get("data", []) if isinstance(discovered["data"], dict) else []
            chosen_codes = indicator_codes
            if chosen_codes is None:
                chosen_codes = [
                    row.get("indicator_code") for row in records
                    if isinstance(row, dict) and any(term in str(row.get("description", "")).casefold()
                                                     for term in ("lfpr", "wpr", "unemployment rate", "ur ("))
                ]
            for code in chosen_codes:
                metadata = self.get_metadata(int(code), frequency_code)
                provenance = metadata.get("provenance", provenance)
                if metadata.get("error") or metadata.get("data") is None:
                    errors.append(metadata.get("error", {"code": "upstream_error", "message": "PLFS metadata unavailable."}))
                    continue
                query = {"indicator_code": int(code), "frequency_code": frequency_code, **(filters or {})}
                fetched = self.get_data(query)
                provenance = fetched.get("provenance", provenance)
                if fetched.get("error") or fetched.get("data") is None:
                    errors.append(fetched.get("error", {"code": "upstream_error", "message": "PLFS data unavailable."}))
                    continue
                raw = fetched["data"]
                if isinstance(raw, dict) and raw.get("statusCode") is False:
                    errors.append({"code": "upstream_error", "message": "MoSPI reported an unsuccessful PLFS response."})
                    continue
                rows = raw.get("data", []) if isinstance(raw, dict) else []
                output.extend(map_plfs_rows(rows, frequency_code, int(code)))

        if provenance is None:
            provenance = {
                "source": SOURCE, "status": "ERROR", "fetched_at": None,
                "from_cache": False, "is_synthetic": False, "stale": False,
            }
        result = {"data": output, "provenance": provenance, "availability": provenance.get("status", "ERROR")}
        if errors:
            result["errors"] = errors
        return result

    def get_status(self) -> dict:
        cached = latest_cache(SOURCE)
        if cached:
            status = "STALE" if cached["stale"] else "CACHED"
            fetched_at = cached["fetched_at"]
        else:
            status = "ERROR"
            fetched_at = None
        return {
            "source": SOURCE, "name": "MoSPI e-Sankhyiki (PLFS)", "configured": bool(self.base_url),
            "status": status, "last_fetched_at": fetched_at, "provenance": SOURCE,
            "message": "Open PLFS endpoints work without a key; employment rates remain contextual indicators.",
        }


def map_plfs_rows(rows: list[dict], frequency_code: int, indicator_code: int) -> list[dict]:
    """Map only values present in upstream rows; absent periods are omitted."""
    output = []
    for row in rows:
        if not isinstance(row, dict) or row.get("value") in (None, ""):
            continue
        try:
            value = float(str(row["value"]).replace(",", ""))
        except (TypeError, ValueError):
            continue
        period = str(row.get("year") or "")
        quarter = row.get("quarter")
        month = row.get("month")
        if quarter:
            period = f"{period}-Q{quarter}"
        elif month:
            period = f"{period}-{month}"
        output.append({
            "signal_type": PLFS_SIGNAL_TYPE,
            "source_name": "plfs",
            "indicator_code": indicator_code,
            "indicator": row.get("indicator"),
            "state": row.get("state"),
            "reference_period": period or None,
            "frequency_code": frequency_code,
            "frequency": row.get("frequency") or {1: "Annual", 2: "Quarterly", 3: "Monthly"}[frequency_code],
            "value": value,
            "unit": row.get("unit"),
            "is_synthetic": False,
            "provenance": SOURCE,
        })
    return output


def _input_error(message: str) -> dict:
    return {
        "data": None,
        "provenance": {"source": SOURCE, "status": "ERROR", "fetched_at": None,
                       "from_cache": False, "is_synthetic": False, "stale": False},
        "error": {"code": "invalid_request", "message": message},
    }
