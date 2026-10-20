"""Status and connection-test helpers for the three requested external sources."""
from __future__ import annotations

import time
from urllib.parse import urljoin

from config import settings
from .data_gov_in_adapter import DataGovInAdapter, SOURCE as DATAGOV_SOURCE
from .external import fetch_json
from .mospi_adapter import MospiAdapter, SOURCE as MOSPI_SOURCE
from .ncs_adapter import NCSAdapter, SOURCE as NCS_SOURCE


def get_source_statuses() -> list[dict]:
    mospi = MospiAdapter().get_status()
    ncs = NCSAdapter().get_status()
    datagov = DataGovInAdapter().get_status()
    return [mospi, ncs, datagov]


def test_source(source: str) -> dict:
    started = time.monotonic()
    if source == MOSPI_SOURCE:
        adapter = MospiAdapter()
        result = fetch_json(
            MOSPI_SOURCE,
            urljoin(adapter.base_url + "/", "api/plfs/getIndicatorListByFrequency"),
            {"frequency_code": 1}, adapter._headers(), force_refresh=True,
        )
    elif source == NCS_SOURCE:
        adapter = NCSAdapter()
        if not adapter.is_configured():
            return _not_configured("An approved NCS endpoint and credential are required after DGE approval.", started)
        result = fetch_json(
            NCS_SOURCE, settings.NCS_API_BASE_URL, None,
            {"Accept": "application/json", "X-API-Key": settings.NCS_API_KEY}, force_refresh=True,
        )
    elif source == DATAGOV_SOURCE:
        if not settings.DATA_GOV_IN_API_KEY:
            return _not_configured("A data.gov.in credential must be configured in the backend.", started)
        if not settings.ESHRAM_RESOURCE_ID:
            return _not_configured("Set ESHRAM_RESOURCE_ID (or pass a resource ID to a normal data request).", started)
        url = f"{settings.DATAGOV_BASE_URL.rstrip('/')}/{settings.ESHRAM_RESOURCE_ID}"
        result = fetch_json(DATAGOV_SOURCE, url, {
            "api-key": settings.DATA_GOV_IN_API_KEY, "format": "json", "limit": 1, "offset": 0,
        }, {"Accept": "application/json"}, force_refresh=True)
    else:
        return {"success": False, "status": "ERROR", "http_status": None,
                "latency_ms": 0, "message": "Unknown source."}

    provenance = result.get("provenance", {})
    payload = result.get("data")
    payload_ok = not isinstance(payload, dict) or payload.get("statusCode") is not False
    success = provenance.get("status") == "LIVE" and not result.get("error") and payload_ok
    return {
        "success": success,
        "status": "LIVE" if success else provenance.get("status", "ERROR"),
        "http_status": result.get("http_status"),
        "latency_ms": int((time.monotonic() - started) * 1000),
        "message": "Connection succeeded." if success else result.get("error", {}).get("message", "Source returned no successful response."),
        "provenance": provenance.get("source"),
        "fetched_at": provenance.get("fetched_at"),
    }


def _not_configured(message: str, started: float) -> dict:
    return {"success": False, "status": "NOT_CONFIGURED", "http_status": None,
            "latency_ms": int((time.monotonic() - started) * 1000), "message": message}
