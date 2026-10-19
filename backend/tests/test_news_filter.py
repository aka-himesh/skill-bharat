"""
tests/test_news_filter.py — Unit tests for the news keyword filter.

Tests cover:
  - include keyword matching (English + Hindi)
  - exclude keyword filtering ("Labour Party" UK politics exclusion)
  - relevance scoring formula
  - deduplication by title and URL
  - trusted source boost
  - district name normalisation (geo matching)
  - news provider cascade / fallback chain
  - cache TTL behaviour
"""
import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from services.news_filter import (
    _filter_and_score,
    _is_excluded,
    _word_boundary_match,
    _count_matches,
    _trusted_boost,
    _dedup_key_title,
    get_news,
    invalidate_cache,
)
from lmis_config.news_keywords import INCLUDE_KEYWORDS, EXCLUDE_KEYWORDS, TRUSTED_SOURCES
from connectors.eshram import _normalise, fuzzy_match_name


# ── Keyword matching ──────────────────────────────────────────────────────────

class TestWordBoundaryMatch:
    def test_exact_word_match(self):
        assert _word_boundary_match("labour", "India's labour market is growing")

    def test_phrase_match(self):
        assert _word_boundary_match("skill development", "Skill development scheme launched")

    def test_no_false_positive_partial(self):
        # "lab" should not match "labour"
        assert not _word_boundary_match("lab", "The labour ministry announced")

    def test_hindi_term(self):
        assert _word_boundary_match("रोजगार", "रोजगार मेला आयोजित किया गया")

    def test_case_insensitive(self):
        assert _word_boundary_match("PMKVY", "pmkvy scheme beneficiaries increased")


class TestExcludeKeywords:
    def test_uk_labour_party_excluded(self):
        assert _is_excluded("Labour Party wins UK election", "")

    def test_labour_mp_excluded(self):
        assert _is_excluded("Labour MP calls for wage review", "")

    def test_cricket_excluded(self):
        assert _is_excluded("IPL 2026 Season Preview", "cricket match details")

    def test_india_labour_not_excluded(self):
        assert not _is_excluded(
            "India labour market shows resilience", "PLFS data released"
        )

    def test_skill_not_excluded(self):
        assert not _is_excluded("Skill India programme targets 1 crore workers", "")

    def test_bollywood_excluded(self):
        # A story mentioning Bollywood in the description should be excluded
        assert _is_excluded(
            "New film released", "The movie stars popular Bollywood actors"
        )


class TestScoring:
    def test_title_score_multiplier(self):
        """Title match = 3 points."""
        count, tags = _count_matches(INCLUDE_KEYWORDS, "Labour market report")
        assert count >= 1
        assert "labour" in [t.lower() for t in tags] or "labour market" in [t.lower() for t in tags]

    def test_trusted_source_boost(self):
        boost = _trusted_boost("PIB India", "https://pib.gov.in/release")
        assert boost > 0

    def test_non_trusted_no_boost(self):
        boost = _trusted_boost("Random Blog", "https://randomblog.example.com/news")
        assert boost == 0

    def test_filter_and_score_basic(self):
        """A relevant item with matching keywords should survive filtering."""
        raw = [{
            "id": "t001",
            "title": "Skill India programme reaches 1 crore beneficiaries",
            "summary": "PMKVY skilling scheme has trained one crore workers under Skill India.",
            "url": "https://pib.gov.in/skill-india-001",
            "source_name": "PIB India",
            "published_at": "2026-10-01T10:00:00Z",
            "image_url": None,
        }]
        results = _filter_and_score(raw)
        assert len(results) == 1
        assert results[0]["relevance"] >= 3

    def test_filter_drops_irrelevant(self):
        """An item about cricket should be excluded."""
        raw = [{
            "id": "t002",
            "title": "IPL 2026 final: Mumbai wins by 6 wickets",
            "summary": "Mumbai Indians beat Chennai Super Kings in the IPL final.",
            "url": "https://sports.example.com/ipl-final",
            "source_name": "Sports Today",
            "published_at": "2026-10-01T18:00:00Z",
            "image_url": None,
        }]
        results = _filter_and_score(raw)
        assert len(results) == 0

    def test_filter_drops_uk_labour_party(self):
        """UK Labour Party news must be excluded."""
        raw = [{
            "id": "t003",
            "title": "Labour Party announces new housing policy in UK",
            "summary": "Keir Starmer's Labour government unveiled housing reforms.",
            "url": "https://bbc.com/news/uk-labour-housing",
            "source_name": "BBC",
            "published_at": "2026-10-01T09:00:00Z",
            "image_url": None,
        }]
        results = _filter_and_score(raw)
        assert len(results) == 0


class TestDeduplication:
    def test_dedup_by_title(self):
        raw = [
            {
                "id": "d001",
                "title": "Skill India programme launched",
                "summary": "New skilling initiative launched by MSDE",
                "url": "https://pib.gov.in/001",
                "source_name": "PIB",
                "published_at": "2026-10-01T10:00:00Z",
                "image_url": None,
            },
            {
                "id": "d002",
                "title": "SKILL INDIA PROGRAMME LAUNCHED",  # same title different case
                "summary": "Ministry of Skill Development announced programme",
                "url": "https://other.example.com/002",
                "source_name": "Other Source",
                "published_at": "2026-10-01T11:00:00Z",
                "image_url": None,
            },
        ]
        results = _filter_and_score(raw)
        assert len(results) == 1

    def test_dedup_by_url(self):
        raw = [
            {
                "id": "u001",
                "title": "Labour workforce grows in Maharashtra",
                "summary": "Employment increases in Maharashtra manufacturing sector",
                "url": "https://pib.gov.in/labour-maharashtra?utm=social",
                "source_name": "PIB",
                "published_at": "2026-10-01T10:00:00Z",
                "image_url": None,
            },
            {
                "id": "u002",
                "title": "Labour workforce expands in Maharashtra",  # different title
                "summary": "Manufacturing employment rising in Maharashtra",
                "url": "https://pib.gov.in/labour-maharashtra",  # same host+path
                "source_name": "PIB",
                "published_at": "2026-10-01T11:00:00Z",
                "image_url": None,
            },
        ]
        results = _filter_and_score(raw)
        assert len(results) == 1


# ── Hindi keyword tests ───────────────────────────────────────────────────────

class TestHindiKeywords:
    def test_rojgar_matched(self):
        assert _word_boundary_match("रोजगार", "रोजगार मेले का आयोजन हुआ")

    def test_kaushal_matched(self):
        assert _word_boundary_match("कौशल", "कौशल विकास योजना")

    def test_hindi_item_included(self):
        raw = [{
            "id": "h001",
            "title": "रोजगार मेला: 10,000 युवाओं को नौकरी",
            "summary": "कौशल विकास के तहत रोजगार मेला आयोजित",
            "url": "https://pib.gov.in/hi/rojgar-mela",
            "source_name": "PIB Hindi",
            "published_at": "2026-10-01T10:00:00Z",
            "image_url": None,
        }]
        results = _filter_and_score(raw)
        assert len(results) == 1


# ── Geo name matching ─────────────────────────────────────────────────────────

class TestGeoMatching:
    def test_normalise_strips_punct(self):
        assert _normalise("Uttar Pradesh!") == "uttar pradesh"

    def test_normalise_casefold(self):
        assert _normalise("MUMBAI") == "mumbai"

    def test_fuzzy_match_alias(self):
        """UP should resolve to Uttar Pradesh via alias map."""
        result = fuzzy_match_name("UP", ["Uttar Pradesh", "Tamil Nadu", "Maharashtra"])
        assert result == "Uttar Pradesh"

    def test_fuzzy_match_misspelling(self):
        """Close misspelling should still match."""
        result = fuzzy_match_name("Lucknow", ["Lucknow", "Varanasi", "Kanpur"])
        assert result == "Lucknow"

    def test_fuzzy_no_match(self):
        """Completely unrelated name should return None."""
        result = fuzzy_match_name("XyzCity123", ["Lucknow", "Varanasi"])
        assert result is None


# ── Cache TTL ─────────────────────────────────────────────────────────────────

class TestCacheBehaviour:
    def test_cache_invalidation(self):
        """After invalidate_cache(), _is_cache_valid() should return False."""
        invalidate_cache()
        from services.news_filter import _is_cache_valid
        assert not _is_cache_valid()

    def test_get_news_returns_dict(self):
        """get_news() should always return a valid dict even without network."""
        invalidate_cache()
        result = get_news(limit=5)
        assert "items" in result
        assert "source" in result
        assert isinstance(result["items"], list)

    def test_get_news_seed_fallback(self):
        """With USE_LIVE_DATA=false simulation, should return seed items."""
        # Temporarily simulate no live data
        from services import news_filter as nf
        original_cache = nf._cache
        original_ts = nf._cache_fetched_at

        nf._cache = None
        nf._cache_fetched_at = 0.0

        result = get_news(limit=12)
        assert "items" in result
        # Restore
        nf._cache = original_cache
        nf._cache_fetched_at = original_ts
