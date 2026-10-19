"""
news_router.py — News endpoints for AI-LMIS.

Endpoints:
  GET /api/news?limit=&q=&lang=   — filtered + scored news items
  GET /api/news/keywords           — active include/exclude keyword lists

News items are fetched from the configured provider (rss by default),
filtered for labour/skilling relevance, and cached for NEWS_CACHE_TTL_MINUTES.
If all live providers fail, falls back to bundled seed headlines.
"""
from fastapi import APIRouter, Depends, Query
from auth import get_current_user
from services.news_filter import get_news, get_keyword_lists, invalidate_cache

router = APIRouter(prefix="/api", tags=["news"])


@router.get("/news", summary="Filtered labour & skilling news feed")
def news_feed(
    limit: int = Query(default=12, ge=1, le=50, description="Max items to return"),
    q: str | None = Query(None, description="Search within title/summary"),
    lang: str | None = Query(None, description="Language filter (not implemented; always en)"),
    _=Depends(get_current_user),
):
    """
    Returns labour/skilling news filtered by keyword relevance score.
    Each item includes `tags` (matched keywords) and `relevance` score.
    When source == "synthetic", a Sample badge should be shown in the UI.
    Links should be opened with rel="noopener noreferrer".
    """
    return get_news(limit=limit, q=q)


@router.get("/news/keywords", summary="Active news keyword filter lists")
def news_keywords(_=Depends(get_current_user)):
    """
    Returns the active include/exclude keyword lists and scoring parameters.
    Displayed on the Methodology page so users understand what is filtered.
    """
    return get_keyword_lists()


@router.post("/admin/refresh/news", include_in_schema=True, summary="Force news cache refresh (demo only)")
def refresh_news():
    """Clears the in-memory news cache so the next call fetches fresh data."""
    invalidate_cache()
    return {"status": "cache_invalidated", "message": "Next /api/news call will fetch fresh data."}
