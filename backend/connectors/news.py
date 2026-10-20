"""
news.py — News provider abstraction for AI-LMIS.

Provider priority: NEWS_PROVIDER env → fallback to rss → bundled seed file.
All providers implement NewsProvider interface and return list[RawNewsItem].

Features per provider:
  - NewsApiProvider: newsapi.org /v2/everything (country=in, language=en)
  - GNewsProvider: gnews.io /v4/search
  - RssProvider: public RSS feeds (no API key required)

Timeout: 10 s, max 2 retries with backoff.
"""
from __future__ import annotations

import json
import logging
import re
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict

import httpx
try:
    import feedparser  # type: ignore
    _FEEDPARSER_OK = True
except ImportError:
    _FEEDPARSER_OK = False

from config import settings
from lmis_config.news_keywords import RSS_FEEDS

logger = logging.getLogger(__name__)

_SEED_FILE = Path(__file__).resolve().parent.parent / "seed" / "news_fallback.json"
_TIMEOUT = 10.0
_MAX_RETRIES = 2


class RawNewsItem(TypedDict):
    id: str
    title: str
    summary: str
    url: str
    source_name: str
    published_at: str          # ISO 8601
    image_url: str | None


# ── HTTP helper ───────────────────────────────────────────────────────────────

def _http_get(url: str, params: dict | None = None, headers: dict | None = None) -> dict:
    last_err: Exception | None = None
    for attempt in range(_MAX_RETRIES + 1):
        try:
            with httpx.Client(timeout=_TIMEOUT) as client:
                resp = client.get(url, params=params or {}, headers=headers or {})
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            last_err = e
            if attempt < _MAX_RETRIES:
                time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"HTTP fetch failed: {last_err}")


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text or "").strip()


def _iso(ts: str | None) -> str:
    """Return ISO datetime string. Falls back to now if unparseable."""
    if not ts:
        return datetime.now(timezone.utc).isoformat()
    try:
        # feedparser gives struct_time
        if hasattr(ts, "tm_year"):
            import calendar
            return datetime.fromtimestamp(calendar.timegm(ts), tz=timezone.utc).isoformat()
        return ts
    except Exception:
        return datetime.now(timezone.utc).isoformat()


def _make_id(url: str) -> str:
    import hashlib
    return hashlib.md5(url.encode()).hexdigest()[:12]


# ── Provider interface ────────────────────────────────────────────────────────

class NewsProvider(ABC):
    name: str = "base"

    @abstractmethod
    def fetch(self) -> list[RawNewsItem]:
        """Return raw unfiltered news items."""


# ── NewsAPI provider ──────────────────────────────────────────────────────────

class NewsApiProvider(NewsProvider):
    name = "newsapi"

    def fetch(self) -> list[RawNewsItem]:
        key = settings.NEWS_API_KEY
        if not key:
            raise ValueError("NEWS_API_KEY not set")

        terms = " OR ".join([
            "skill development", "employment India", "labour market India",
            "skilling India", "PMKVY", "eShram workers",
        ])
        data = _http_get(
            "https://newsapi.org/v2/everything",
            params={
                "q": terms,
                "language": "en",
                "sortBy": "publishedAt",
                "pageSize": 50,
                "apiKey": key,
            },
        )
        items: list[RawNewsItem] = []
        for a in data.get("articles", []):
            items.append({
                "id": _make_id(a.get("url", "")),
                "title": _strip_html(a.get("title", "")),
                "summary": _strip_html(a.get("description", "")),
                "url": a.get("url", ""),
                "source_name": a.get("source", {}).get("name", "NewsAPI"),
                "published_at": _iso(a.get("publishedAt")),
                "image_url": a.get("urlToImage"),
            })
        return items


# ── GNews provider ────────────────────────────────────────────────────────────

class GNewsProvider(NewsProvider):
    name = "gnews"

    def fetch(self) -> list[RawNewsItem]:
        key = settings.NEWS_API_KEY
        if not key:
            raise ValueError("NEWS_API_KEY not set for gnews")
        data = _http_get(
            "https://gnews.io/api/v4/search",
            params={
                "q": "skill development OR employment OR labour market",
                "lang": "en",
                "country": "in",
                "max": 50,
                "token": key,
            },
        )
        items: list[RawNewsItem] = []
        for a in data.get("articles", []):
            items.append({
                "id": _make_id(a.get("url", "")),
                "title": _strip_html(a.get("title", "")),
                "summary": _strip_html(a.get("description", "")),
                "url": a.get("url", ""),
                "source_name": a.get("source", {}).get("name", "GNews"),
                "published_at": _iso(a.get("publishedAt")),
                "image_url": a.get("image"),
            })
        return items


# ── RSS provider ──────────────────────────────────────────────────────────────

class RssProvider(NewsProvider):
    name = "rss"

    def fetch(self) -> list[RawNewsItem]:
        if not _FEEDPARSER_OK:
            raise ImportError("feedparser not installed")
        items: list[RawNewsItem] = []
        for feed_url in RSS_FEEDS:
            try:
                feed = feedparser.parse(feed_url)
                for entry in feed.entries[:25]:
                    items.append({
                        "id": _make_id(entry.get("link", entry.get("id", ""))),
                        "title": _strip_html(entry.get("title", "")),
                        "summary": _strip_html(
                            entry.get("summary", entry.get("description", ""))
                        )[:500],
                        "url": entry.get("link", ""),
                        "source_name": feed.feed.get("title", "RSS"),
                        "published_at": _iso(entry.get("published_parsed", entry.get("updated_parsed"))),
                        "image_url": None,
                    })
            except Exception as e:
                logger.warning("[news/rss] Feed request failed (%s).", type(e).__name__)
        return items


# ── Seed fallback ─────────────────────────────────────────────────────────────

class SeedProvider(NewsProvider):
    name = "seed"

    def fetch(self) -> list[RawNewsItem]:
        try:
            with open(_SEED_FILE, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []


# ── Provider factory ──────────────────────────────────────────────────────────

def get_provider() -> NewsProvider:
    """Return the configured provider, cascading to rss then seed on failure."""
    name = settings.NEWS_PROVIDER.lower()
    candidates: list[NewsProvider] = []

    if name == "newsapi":
        candidates = [NewsApiProvider(), RssProvider(), SeedProvider()]
    elif name == "gnews":
        candidates = [GNewsProvider(), RssProvider(), SeedProvider()]
    else:
        candidates = [RssProvider(), SeedProvider()]

    for provider in candidates:
        try:
            items = provider.fetch()
            if items:
                logger.info("[news] Provider %s returned %d raw items", provider.name, len(items))
                return provider
        except Exception as e:
            logger.warning("[news] Provider %s failed (%s); trying next", provider.name, type(e).__name__)

    return SeedProvider()
