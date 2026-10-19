"""
news_keywords.py — Hard-coded keyword lists for labour/skilling news filtering.

Edit INCLUDE_KEYWORDS or EXCLUDE_KEYWORDS here and restart the backend;
no DB migration required. The /api/news/keywords endpoint exposes these.

SCORING:
  relevance = (title_matches × 3) + (description_matches × 1)
              + TRUSTED_SOURCE_BOOST if source domain is in TRUSTED_SOURCES
  Items with relevance < MIN_SCORE are dropped.
"""

# ── Include – case-insensitive, whole-word/phrase matching ───────────────────
INCLUDE_KEYWORDS: list[str] = [
    # Employment & labour market
    "labour", "labor", "labour market", "labor market",
    "employment", "unemployment",
    "jobs", "job market", "hiring", "recruitment",
    "layoffs", "lay-offs", "retrenchment",
    "workforce", "manpower",
    # Skills
    "skill", "skills", "skilling", "upskilling", "reskilling",
    "skill development", "skill gap",
    "apprenticeship", "internship",
    "training", "vocational",
    # Programmes & acronyms
    "ITI", "NSQF", "NCVET", "MSDE",
    "PMKVY", "Skill India",
    "e-Shram", "eShram",
    "NCS", "National Career Service",
    "PLFS",
    # Worker categories
    "unorganised workers", "informal workers",
    "gig workers", "gig economy",
    "migrant workers", "migrant labour",
    # Wages & policy
    "minimum wage", "wages", "wage",
    "labour code", "labor code",
    "Viksit Bharat", "Viksit Bharat jobs",
    "placement", "job placement",
    # Hindi terms (romanised/devanagari)
    "रोज़गार", "रोजगार", "श्रम", "कौशल",
    "कुशल", "बेरोजगारी", "नौकरी", "प्रशिक्षण", "भर्ती",
]

# ── Exclude – items matched by any of these are discarded ───────────────────
EXCLUDE_KEYWORDS: list[str] = [
    # UK Labour Party politics
    "Labour Party", "Labour MP", "Labour government",
    "Shadow Chancellor", "Keir Starmer",
    # Entertainment / non-relevant
    "celebrity", "cricket", "box office",
    "horoscope", "IPL", "stock tips",
    "Bollywood", "film", "movie",
    "entertainment", "fashion",
]

# ── Trusted sources – domain fragments, matched case-insensitively ───────────
TRUSTED_SOURCES: list[str] = [
    "pib.gov.in", "pib.nic.in",
    "thehindu.com", "economictimes", "livemint.com",
    "mint.com", "business-standard.com",
    "indianexpress.com", "hindustantimes.com",
    "etgovernment", "financialexpress.com",
    "ndtv.com", "theprint.in",
]

# Boost added to relevance score for items from trusted sources
TRUSTED_SOURCE_BOOST: int = 2

# Minimum combined relevance score to include an item
MIN_SCORE: int = 1

# ── RSS feeds (no API key needed) ────────────────────────────────────────────
RSS_FEEDS: list[str] = [
    # PIB India — Labour Ministry press releases
    "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3",
    # Google News RSS — labour market India
    "https://news.google.com/rss/search?q=labour+market+India+employment&hl=en-IN&gl=IN&ceid=IN:en",
    # Google News RSS — skill development India
    "https://news.google.com/rss/search?q=skill+development+India+PMKVY&hl=en-IN&gl=IN&ceid=IN:en",
    # Google News RSS — e-Shram
    "https://news.google.com/rss/search?q=eShram+India+unorganised+workers&hl=en-IN&gl=IN&ceid=IN:en",
]
