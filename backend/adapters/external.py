"""Shared cache, retry and circuit-breaker plumbing for external APIs."""
from __future__ import annotations

import hashlib
import json
import logging
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from sqlalchemy import text

from config import settings
from database import SessionLocal

logger = logging.getLogger(__name__)

_breaker_lock = threading.Lock()
_breaker: dict[str, dict[str, Any]] = {}
_BREAKER_THRESHOLD = 3
_BREAKER_RESET_SECONDS = 60


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def safe_error(exc: Exception) -> str:
    """Avoid returning request exception details, which may embed query credentials."""
    return type(exc).__name__


def request_hash(url: str, params: dict | None = None) -> str:
    """Hash request identity without persisting API keys or raw URL parameters."""
    safe_params = {
        str(key): value for key, value in (params or {}).items()
        if str(key).casefold() not in {"api-key", "api_key", "apikey", "key", "token"}
    }
    material = json.dumps(
        {"url": url, "params": safe_params}, sort_keys=True, separators=(",", ":"), default=str
    )
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def cache_lookup(source: str, key: str, include_expired: bool = False) -> dict | None:
    db = SessionLocal()
    try:
        row = db.execute(text(
            "SELECT payload, fetched_at, expires_at FROM external_cache "
            "WHERE source=:source AND request_hash=:request_hash"
        ), {"source": source, "request_hash": key}).fetchone()
        if not row:
            return None
        payload, fetched_at, expires_at = row
        expires = datetime.fromisoformat(expires_at)
        fetched = datetime.fromisoformat(fetched_at)
        stale = expires <= utc_now()
        if stale and not include_expired:
            return None
        return {"data": json.loads(payload), "fetched_at": fetched.isoformat(), "stale": stale}
    finally:
        db.close()


def latest_cache(source: str) -> dict | None:
    db = SessionLocal()
    try:
        row = db.execute(text(
            "SELECT payload, fetched_at, expires_at FROM external_cache "
            "WHERE source=:source ORDER BY fetched_at DESC LIMIT 1"
        ), {"source": source}).fetchone()
        if not row:
            return None
        payload, fetched_at, expires_at = row
        return {
            "fetched_at": fetched_at,
            "expires_at": expires_at,
            "stale": datetime.fromisoformat(expires_at) <= utc_now(),
            "data": json.loads(payload),
        }
    finally:
        db.close()


def cache_store(source: str, key: str, payload: Any) -> str:
    now = utc_now()
    expires = now + timedelta(hours=settings.EXTERNAL_CACHE_TTL_HOURS)
    db = SessionLocal()
    try:
        db.execute(text(
            "INSERT OR REPLACE INTO external_cache(source, request_hash, payload, fetched_at, expires_at) "
            "VALUES (:source, :request_hash, :payload, :fetched_at, :expires_at)"
        ), {
            "source": source,
            "request_hash": key,
            "payload": json.dumps(payload, ensure_ascii=False),
            "fetched_at": now.isoformat(),
            "expires_at": expires.isoformat(),
        })
        db.commit()
    finally:
        db.close()
    return now.isoformat()


def _breaker_open(source: str) -> bool:
    with _breaker_lock:
        item = _breaker.get(source)
        if not item:
            return False
        if item.get("open_until", 0) <= time.monotonic():
            item["failures"] = 0
            item["open_until"] = 0
            return False
        return True


def _breaker_success(source: str) -> None:
    with _breaker_lock:
        _breaker[source] = {"failures": 0, "open_until": 0}


def _breaker_failure(source: str) -> None:
    with _breaker_lock:
        item = _breaker.setdefault(source, {"failures": 0, "open_until": 0})
        item["failures"] += 1
        if item["failures"] >= _BREAKER_THRESHOLD:
            item["open_until"] = time.monotonic() + _BREAKER_RESET_SECONDS


def reset_breaker(source: str | None = None) -> None:
    with _breaker_lock:
        if source is None:
            _breaker.clear()
        else:
            _breaker.pop(source, None)


def fetch_json(source: str, url: str, params: dict | None = None,
               headers: dict | None = None, force_refresh: bool = False) -> dict:
    """Fetch JSON with TTL cache, bounded retry, stale fallback and breaker."""
    key = request_hash(url, params)
    cached = cache_lookup(source, key) if not force_refresh else None
    if cached is not None:
        return {
            "data": cached["data"],
            "http_status": None,
            "provenance": {
                "source": source, "status": "CACHED", "fetched_at": cached["fetched_at"],
                "from_cache": True, "is_synthetic": False, "stale": False,
            },
        }

    stale = cache_lookup(source, key, include_expired=True)
    if _breaker_open(source):
        if stale:
            return {
                "data": stale["data"],
                "http_status": None,
                "provenance": {
                    "source": source, "status": "STALE", "fetched_at": stale["fetched_at"],
                    "from_cache": True, "is_synthetic": False, "stale": True,
                },
            }
        return _error_result(source, "circuit_open", "Source temporarily paused after repeated failures.")

    timeout_s = settings.EXTERNAL_REQUEST_TIMEOUT_MS / 1000
    last_error: Exception | None = None
    http_status: int | None = None
    for attempt in range(settings.EXTERNAL_MAX_RETRIES + 1):
        try:
            response = httpx.get(url, params=params, headers=headers, timeout=timeout_s)
            http_status = response.status_code
            response.raise_for_status()
            payload = response.json()
            fetched_at = cache_store(source, key, payload)
            _breaker_success(source)
            return {
                "data": payload,
                "http_status": response.status_code,
                "provenance": {
                    "source": source, "status": "LIVE", "fetched_at": fetched_at,
                    "from_cache": False, "is_synthetic": False, "stale": False,
                },
            }
        except Exception as exc:  # HTTP, timeout and invalid JSON failures share this policy.
            last_error = exc
            if attempt < settings.EXTERNAL_MAX_RETRIES:
                time.sleep(min(0.25 * (2 ** attempt), 2.0))

    _breaker_failure(source)
    error_kind = type(last_error).__name__ if last_error else "RequestError"
    logger.warning("[external:%s] Request failed after retries (%s).", source, error_kind)
    if stale:
        return {
            "data": stale["data"],
            "http_status": http_status,
            "provenance": {
                "source": source, "status": "STALE", "fetched_at": stale["fetched_at"],
                "from_cache": True, "is_synthetic": False, "stale": True,
            },
        }
    return _error_result(source, "upstream_error", safe_error(last_error or RuntimeError("Request failed")), http_status)


def _error_result(source: str, code: str, message: str, http_status: int | None = None) -> dict:
    return {
        "data": None,
        "http_status": http_status,
        "provenance": {
            "source": source, "status": "ERROR", "fetched_at": None,
            "from_cache": False, "is_synthetic": False, "stale": False,
        },
        "error": {"code": code, "message": message},
    }
