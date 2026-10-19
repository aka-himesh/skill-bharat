"""
eshram.py — Live e-Shram connector via data.gov.in API.

ROLE IN THE PIPELINE:
  e-Shram registrations are a SUPPLY-SIDE / workforce-size signal.
  They count unorganised workers who have self-registered, NOT vacancies.
  Used as:
    1. A supply-side indicator in the Demand–Supply panel.
    2. A district weighting factor in the demand index calibration.
  Do NOT present registration counts as job vacancies.

DATA SOURCE:
  data.gov.in → "District-wise Demographic Data of Unorganised Workers
  registered on eShram as on Previous Day"
  API: GET {DATAGOV_BASE_URL}/{ESHRAM_RESOURCE_ID}?api-key=KEY&format=json

FALLBACK CHAIN (on any error):
  live → latest SQLite snapshot → synthetic fallback

CACHE STRATEGY:
  Paginated results stored in eshram_snapshots table.
  api_cache table stores raw response payloads with TTL.
  Background refresh every ESHRAM_CACHE_TTL_HOURS via APScheduler.
"""
from __future__ import annotations

import json
import logging
import re
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

from config import settings

logger = logging.getLogger(__name__)

# ── Geo normalisation helpers ─────────────────────────────────────────────────
_ALIAS_FILE = Path(__file__).resolve().parent.parent / "lmis_config" / "geo_aliases.json"
_geo_aliases: dict = {}


def _load_geo_aliases() -> dict:
    global _geo_aliases
    if not _geo_aliases:
        try:
            with open(_ALIAS_FILE, encoding="utf-8") as f:
                _geo_aliases = json.load(f)
        except Exception:
            _geo_aliases = {"states": {}, "districts": {}}
    return _geo_aliases


def _normalise(name: str) -> str:
    """Lowercase, strip punctuation, normalise unicode."""
    name = unicodedata.normalize("NFC", name).casefold()
    name = re.sub(r"[^\w\s]", "", name)
    return " ".join(name.split())


def fuzzy_match_name(raw: str, canonical_names: list[str], threshold: float = 80.0) -> str | None:
    """
    Return the best-matching canonical name or None if below threshold.
    Uses rapidfuzz if available, otherwise falls back to simple substring check.
    """
    norm = _normalise(raw)
    aliases = _load_geo_aliases()

    # 1. Direct match against alias values
    for level in ("states", "districts"):
        for canonical, alts in aliases.get(level, {}).items():
            if norm in [_normalise(a) for a in alts] or norm == _normalise(canonical):
                return canonical

    # 2. Fuzzy match
    try:
        from rapidfuzz import process, fuzz
        result = process.extractOne(
            norm,
            [_normalise(n) for n in canonical_names],
            scorer=fuzz.token_sort_ratio,
        )
        if result and result[1] >= threshold:
            idx = result[2]
            return canonical_names[idx]
    except ImportError:
        # Fallback: substring
        for canonical in canonical_names:
            if norm in _normalise(canonical) or _normalise(canonical) in norm:
                return canonical

    return None


# ── HTTP helpers ──────────────────────────────────────────────────────────────
_TIMEOUT = 10.0
_MAX_RETRIES = 2
_RETRY_BACKOFF = 1.5  # seconds


def _get_with_retry(url: str, params: dict) -> dict:
    """GET with timeout and retry-with-backoff. Returns parsed JSON."""
    last_err: Exception | None = None
    for attempt in range(_MAX_RETRIES + 1):
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.get(url, params=params)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            last_err = e
            if attempt < _MAX_RETRIES:
                time.sleep(_RETRY_BACKOFF * (attempt + 1))
    raise RuntimeError(f"HTTP fetch failed after {_MAX_RETRIES + 1} attempts: {last_err}")


# ── Synthetic fallback ────────────────────────────────────────────────────────
_SYNTHETIC_STATES = [
    "Uttar Pradesh", "Maharashtra", "Tamil Nadu", "Madhya Pradesh",
    "Rajasthan", "Bihar", "Gujarat", "West Bengal",
]
_SYNTHETIC_DISTRICTS = {
    "Uttar Pradesh": ["Lucknow", "Varanasi", "Kanpur", "Agra"],
    "Maharashtra": ["Mumbai", "Pune", "Nashik", "Nagpur"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur"],
}


def _build_synthetic() -> dict:
    import random
    rng = random.Random(42)
    rows = []
    for state in _SYNTHETIC_STATES:
        districts = _SYNTHETIC_DISTRICTS.get(state, [f"{state} D1", f"{state} D2"])
        for district in districts:
            rows.append({
                "state": state,
                "district": district,
                "registered_workers_total": rng.randint(15_000, 250_000),
                "male": rng.randint(8_000, 150_000),
                "female": rng.randint(5_000, 100_000),
                "age_18_40": rng.randint(5_000, 120_000),
                "age_40_plus": rng.randint(2_000, 80_000),
                "sc": rng.randint(2_000, 60_000),
                "st": rng.randint(500, 30_000),
                "obc": rng.randint(5_000, 90_000),
                "general": rng.randint(3_000, 70_000),
                "snapshot_date": datetime.now(timezone.utc).date().isoformat(),
                "source": "synthetic",
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            })
    return {"rows": rows, "total": len(rows), "source": "synthetic"}


# ── Main connector ────────────────────────────────────────────────────────────
class EshramLiveConnector:
    """
    Fetches district-wise e-Shram registration data from data.gov.in.

    Always returns {"rows": [...], "total": N, "source": "live"|"cached"|"synthetic",
                    "snapshot_date": "YYYY-MM-DD", "fetched_at": "<ISO>"}
    """

    def __init__(self):
        self._db_session_factory = None  # set after DB init

    def set_db(self, session_factory):
        self._db_session_factory = session_factory

    # ── Public API ────────────────────────────────────────────────────────────

    def fetch_summary(self, state: str | None = None) -> dict:
        """State-wise totals + national total + top districts."""
        data = self._get_data(state=state)
        rows = data["rows"]

        # Aggregate by state
        state_totals: dict[str, int] = {}
        for r in rows:
            state_totals[r["state"]] = state_totals.get(r["state"], 0) + r["registered_workers_total"]

        national_total = sum(state_totals.values())
        top_districts = sorted(rows, key=lambda r: r["registered_workers_total"], reverse=True)[:10]

        return {
            "national_total": national_total,
            "state_totals": [{"state": k, "total": v} for k, v in sorted(state_totals.items(), key=lambda x: -x[1])],
            "top_districts": top_districts,
            "record_count": len(rows),
            "source": data["source"],
            "snapshot_date": data.get("snapshot_date"),
            "fetched_at": data.get("fetched_at"),
        }

    def fetch_districts(self, state: str | None = None, q: str | None = None) -> dict:
        """All district rows, optionally filtered by state or name search."""
        data = self._get_data(state=state)
        rows = data["rows"]
        if q:
            q_lower = q.lower()
            rows = [r for r in rows if q_lower in r["district"].lower() or q_lower in r["state"].lower()]
        return {
            "rows": rows,
            "count": len(rows),
            "source": data["source"],
            "snapshot_date": data.get("snapshot_date"),
            "fetched_at": data.get("fetched_at"),
        }

    def fetch_district_detail(self, district: str) -> dict | None:
        """Demographic breakdown for a single district."""
        data = self._get_data()
        for r in data["rows"]:
            if _normalise(r["district"]) == _normalise(district):
                return {**r, "source": data["source"]}
        return None

    def get_status(self) -> dict:
        """Status dict compatible with sources_router format."""
        live_ready = settings.eshram_live_ready
        return {
            "name": "e-Shram (data.gov.in)",
            "adapter_name": "eshram_live",
            "status": "live" if live_ready else "synthetic",
            "provenance_type": "official" if live_ready else "synthetic",
            "message": (
                "Live: data.gov.in district-wise registration data."
                if live_ready
                else "Demo mode — set DATAGOV_API_KEY + ESHRAM_RESOURCE_ID in .env for live data."
            ),
            "last_updated": None,
            "record_count": None,
            "latency_ms": None,
            "real_connector_ready": live_ready,
        }

    # ── Internal ──────────────────────────────────────────────────────────────

    def _get_data(self, state: str | None = None) -> dict:
        """Return data with fallback chain: live → cache → synthetic."""
        if not settings.eshram_live_ready:
            return _build_synthetic()

        # Try live
        try:
            return self._fetch_live(state=state)
        except Exception as e:
            logger.warning("[eshram] Live fetch failed: %s — trying cache", e)

        # Try cache
        try:
            cached = self._load_from_cache()
            if cached:
                return cached
        except Exception as e:
            logger.warning("[eshram] Cache load failed: %s — using synthetic", e)

        return _build_synthetic()

    def _fetch_live(self, state: str | None = None) -> dict:
        """Paginate through data.gov.in and return normalised rows."""
        url = f"{settings.DATAGOV_BASE_URL}/{settings.ESHRAM_RESOURCE_ID}"
        limit = 100
        offset = 0
        all_records: list[dict] = []
        snapshot_date = datetime.now(timezone.utc).date().isoformat()

        while True:
            params: dict[str, Any] = {
                "api-key": settings.DATAGOV_API_KEY,
                "format": "json",
                "limit": limit,
                "offset": offset,
            }
            if state:
                # data.gov.in filter syntax varies; try common field names
                params["filters[state_name]"] = state

            t0 = time.monotonic()
            data = _get_with_retry(url, params)
            latency = int((time.monotonic() - t0) * 1000)

            records = data.get("records", data.get("data", []))
            if not records:
                break

            all_records.extend(records)

            total = int(data.get("total", data.get("count", len(all_records))))
            offset += limit
            if offset >= total:
                break

        rows = [self._normalise_record(r) for r in all_records]
        rows = [r for r in rows if r is not None]

        result = {
            "rows": rows,
            "total": len(rows),
            "source": "live",
            "snapshot_date": snapshot_date,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "latency_ms": latency,
        }

        # Persist to cache
        self._save_to_cache(result)
        return result

    def _normalise_record(self, raw: dict) -> dict | None:
        """
        Map raw data.gov.in field names → our schema.
        Field names discovered from the real API via inspect_eshram.py.
        We try multiple candidate field names for resilience.
        """
        def _pick(*keys: str, default=0) -> Any:
            for k in keys:
                if k in raw and raw[k] not in (None, "", "N/A"):
                    try:
                        return int(str(raw[k]).replace(",", ""))
                    except (ValueError, TypeError):
                        pass
            return default

        def _pick_str(*keys: str, default="Unknown") -> str:
            for k in keys:
                if k in raw and raw[k] not in (None, "", "N/A"):
                    return str(raw[k]).strip()
            return default

        state = _pick_str(
            "state_name", "state", "statename", "State Name", "State",
        )
        district = _pick_str(
            "district_name", "district", "districtname", "District Name", "District",
        )

        if state == "Unknown" or district == "Unknown":
            return None

        total = _pick(
            "registered_workers", "total_workers", "total", "worker_count",
            "no_of_workers", "workers_count", "count",
        )

        return {
            "state": state,
            "district": district,
            "registered_workers_total": total,
            "male": _pick("male", "male_workers", "males"),
            "female": _pick("female", "female_workers", "females"),
            "age_18_40": _pick("age_18_40", "18_40", "youth"),
            "age_40_plus": _pick("age_40_plus", "above_40", "senior"),
            "sc": _pick("sc", "scheduled_caste"),
            "st": _pick("st", "scheduled_tribe"),
            "obc": _pick("obc", "other_backward"),
            "general": _pick("general", "general_category"),
            "snapshot_date": datetime.now(timezone.utc).date().isoformat(),
            "source": "live",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

    # ── SQLite cache ──────────────────────────────────────────────────────────

    def _cache_key(self) -> str:
        return "eshram_district_all"

    def _save_to_cache(self, data: dict) -> None:
        """Persist full payload to SQLite api_cache table."""
        if self._db_session_factory is None:
            return
        try:
            from sqlalchemy import text
            db = self._db_session_factory()
            key = self._cache_key()
            payload = json.dumps(data)
            now = datetime.now(timezone.utc).isoformat()
            db.execute(
                text(
                    "INSERT OR REPLACE INTO api_cache(cache_key, payload_json, fetched_at, ttl_hours) "
                    "VALUES (:k, :p, :t, :ttl)"
                ),
                {"k": key, "p": payload, "t": now, "ttl": settings.ESHRAM_CACHE_TTL_HOURS},
            )
            db.commit()
            db.close()
        except Exception as e:
            logger.warning("[eshram] Cache save error: %s", e)

    def _load_from_cache(self) -> dict | None:
        """Load from SQLite cache if not expired."""
        if self._db_session_factory is None:
            return None
        try:
            from sqlalchemy import text
            db = self._db_session_factory()
            row = db.execute(
                text("SELECT payload_json, fetched_at, ttl_hours FROM api_cache WHERE cache_key = :k"),
                {"k": self._cache_key()},
            ).fetchone()
            db.close()
            if not row:
                return None
            payload_json, fetched_at_str, ttl_hours = row
            fetched_at = datetime.fromisoformat(fetched_at_str)
            age_hours = (datetime.now(timezone.utc) - fetched_at).total_seconds() / 3600
            if age_hours > ttl_hours:
                return None
            data = json.loads(payload_json)
            data["source"] = "cached"
            return data
        except Exception as e:
            logger.warning("[eshram] Cache load error: %s", e)
            return None

    def get_unmatched_districts(self, canonical_districts: list[str]) -> list[dict]:
        """
        Return districts from the last cache whose names could not be
        fuzzy-matched to any canonical district in our DB.
        """
        data = self._get_data()
        unmatched = []
        for row in data["rows"]:
            match = fuzzy_match_name(row["district"], canonical_districts)
            if not match:
                unmatched.append({"state": row["state"], "district": row["district"]})
        return unmatched


# Singleton
eshram_connector = EshramLiveConnector()
