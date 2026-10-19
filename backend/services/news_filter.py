"""
news_filter.py — Keyword filtering and scoring for labour/skilling news.

Scoring formula:
  relevance = (title_match_count × 3) + (description_match_count × 1)
              + TRUSTED_SOURCE_BOOST if source is in TRUSTED_SOURCES
  Items with relevance < MIN_SCORE are dropped.
  Items matching any EXCLUDE_KEYWORD are dropped entirely.

Deduplication: by normalised title (case-fold + strip punctuation),
then by normalised URL host + path (ignores query params).
"""
from __future__ import annotations

import hashlib
import json
import logging
import re
import time
import unicodedata
from datetime import datetime, timezone
from typing import TypedDict

from config import settings
from lmis_config.news_keywords import (
    INCLUDE_KEYWORDS,
    EXCLUDE_KEYWORDS,
    TRUSTED_SOURCES,
    TRUSTED_SOURCE_BOOST,
    MIN_SCORE,
)
from connectors.news import RawNewsItem, get_provider

logger = logging.getLogger(__name__)


class NewsItem(TypedDict):
    id: str
    title: str
    summary: str
    url: str
    source_name: str
    published_at: str
    image_url: str | None
    tags: list[str]
    relevance: int


# ── Text helpers ──────────────────────────────────────────────────────────────

_PUNCT_RE = re.compile(r"[^\w\s]")


def _normalise_text(text: str) -> str:
    text = unicodedata.normalize("NFC", text).casefold()
    text = _PUNCT_RE.sub(" ", text)
    return " ".join(text.split())


def _word_boundary_match(keyword: str, text: str) -> bool:
    """
    True if the keyword (or phrase) appears as a whole-word match in text.
    For phrases we simply check substring after both are normalised.
    """
    kw = _normalise_text(keyword)
    txt = _normalise_text(text)
    if " " in kw:
        return kw in txt
    # Single word: require word boundary
    return bool(re.search(r"\b" + re.escape(kw) + r"\b", txt))


def _count_matches(keywords: list[str], text: str) -> tuple[int, list[str]]:
    """Count how many keywords match text. Returns (count, matched_keywords)."""
    matched = []
    for kw in keywords:
        if _word_boundary_match(kw, text):
            matched.append(kw)
    return len(matched), matched


def _is_excluded(title: str, summary: str) -> bool:
    combined = title + " " + summary
    for kw in EXCLUDE_KEYWORDS:
        if _word_boundary_match(kw, combined):
            return True
    return False


def _trusted_boost(source_name: str, url: str) -> int:
    combined = (source_name + " " + url).lower()
    for domain in TRUSTED_SOURCES:
        if domain.lower() in combined:
            return TRUSTED_SOURCE_BOOST
    return 0


def _dedup_key_title(title: str) -> str:
    return hashlib.md5(_normalise_text(title).encode()).hexdigest()


def _dedup_key_url(url: str) -> str:
    """Normalise URL: strip query params, lowercase."""
    try:
        from urllib.parse import urlparse
        p = urlparse(url)
        return (p.netloc + p.path).lower().rstrip("/")
    except Exception:
        return url.lower()


# ── Cache ─────────────────────────────────────────────────────────────────────

_cache: dict | None = None
_cache_fetched_at: float = 0.0
_cache_source: str = "synthetic"


def _is_cache_valid() -> bool:
    age_s = time.monotonic() - _cache_fetched_at
    return _cache is not None and age_s < (settings.NEWS_CACHE_TTL_MINUTES * 60)


# ── Main service ──────────────────────────────────────────────────────────────

def get_news(limit: int | None = None, q: str | None = None) -> dict:
    """
    Fetch, filter, score and deduplicate news items.
    Returns {"source", "provider", "fetched_at", "items": [NewsItem]}.
    """
    global _cache, _cache_fetched_at, _cache_source

    if _is_cache_valid() and _cache is not None:
        items = _cache["items"]
        if q:
            q_lower = q.lower()
            items = [i for i in items if q_lower in i["title"].lower() or q_lower in i["summary"].lower()]
        return {**_cache, "items": items[: limit or settings.NEWS_MAX_ITEMS]}

    # Fetch from provider
    source = "synthetic"
    provider_name = "seed"
    raw_items: list[RawNewsItem] = []

    if settings.news_live_ready:
        try:
            provider = get_provider()
            raw_items = provider.fetch()
            provider_name = provider.name
            source = "live" if provider_name != "seed" else "synthetic"
        except Exception as e:
            logger.warning("[news_filter] Provider fetch failed: %s", e)

    if not raw_items:
        # Seed fallback
        from connectors.news import SeedProvider
        raw_items = SeedProvider().fetch()
        source = "synthetic"
        provider_name = "seed"

    filtered = _filter_and_score(raw_items)
    result = {
        "source": source,
        "provider": provider_name,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "items": filtered,
    }

    _cache = result
    _cache_fetched_at = time.monotonic()
    _cache_source = source

    if q:
        q_lower = q.lower()
        filtered = [i for i in filtered if q_lower in i["title"].lower() or q_lower in i["summary"].lower()]

    return {**result, "items": filtered[: limit or settings.NEWS_MAX_ITEMS]}


def _filter_and_score(raw: list[RawNewsItem]) -> list[NewsItem]:
    seen_titles: set[str] = set()
    seen_urls: set[str] = set()
    out: list[NewsItem] = []

    for item in raw:
        title = item.get("title", "")
        summary = item.get("summary", "")
        url = item.get("url", "")

        if not title or not url:
            continue

        # Dedup
        tk = _dedup_key_title(title)
        uk = _dedup_key_url(url)
        if tk in seen_titles or uk in seen_urls:
            continue

        # Exclude check
        if _is_excluded(title, summary):
            continue

        # Score
        title_count, title_tags = _count_matches(INCLUDE_KEYWORDS, title)
        desc_count, desc_tags = _count_matches(INCLUDE_KEYWORDS, summary)
        boost = _trusted_boost(item.get("source_name", ""), url)
        relevance = title_count * 3 + desc_count + boost

        effective_min = settings.NEWS_MIN_SCORE if hasattr(settings, "NEWS_MIN_SCORE") else MIN_SCORE
        if relevance < effective_min:
            continue

        # Deduplicate tags (title tags take precedence)
        tags = list(dict.fromkeys(title_tags + desc_tags))[:6]

        seen_titles.add(tk)
        seen_urls.add(uk)
        out.append(NewsItem(
            id=item.get("id", ""),
            title=title,
            summary=summary[:400],
            url=url,
            source_name=item.get("source_name", ""),
            published_at=item.get("published_at", ""),
            image_url=item.get("image_url"),
            tags=tags,
            relevance=relevance,
        ))

    # Sort by (published_at desc, relevance desc)
    out.sort(key=lambda x: (x.get("published_at", ""), x.get("relevance", 0)), reverse=True)
    return out[: settings.NEWS_MAX_ITEMS]


def invalidate_cache() -> None:
    """Force a fresh fetch on next call."""
    global _cache, _cache_fetched_at
    _cache = None
    _cache_fetched_at = 0.0


def get_keyword_lists() -> dict:
    return {
        "include_keywords": INCLUDE_KEYWORDS,
        "exclude_keywords": EXCLUDE_KEYWORDS,
        "trusted_sources": TRUSTED_SOURCES,
        "trusted_source_boost": TRUSTED_SOURCE_BOOST,
        "min_score": settings.NEWS_MIN_SCORE,
        "scoring_formula": "title_matches×3 + description_matches×1 + trusted_source_boost",
    }
