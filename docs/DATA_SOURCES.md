# Data Sources — AI-LMIS

> **Scope:** All external data sources integrated into the AI-LMIS platform as of Phase 2.

---

## 1. e-Shram (data.gov.in)

| Attribute | Value |
|-----------|-------|
| **Full name** | District-wise Demographic Data of Unorganised Workers registered on eShram as on Previous Day |
| **Provider** | Ministry of Labour & Employment via data.gov.in Open Government Data Platform |
| **API endpoint** | `GET {DATAGOV_BASE_URL}/{ESHRAM_RESOURCE_ID}?api-key=KEY&format=json&limit=N&offset=M` |
| **Refresh frequency** | Daily (dataset is "as on previous day") |
| **Cache TTL** | 24 hours (`ESHRAM_CACHE_TTL_HOURS`) |
| **License** | [NDSAP - National Data Sharing and Accessibility Policy](https://data.gov.in/ndsap) |
| **Attribution** | © data.gov.in, Ministry of Labour & Employment |
| **Fallback** | Latest cached SQLite snapshot → synthetic fallback |

### Role in the Pipeline

> **IMPORTANT:** e-Shram registrations are a **SUPPLY-SIDE / workforce-size indicator**, NOT a count of job vacancies. Self-registered counts reflect where the unorganised workforce is located. They are used as:
> 1. A supply-side panel on the Overview and State/District pages.
> 2. A **district weighting factor** in the demand index calibration — districts with more registered workers get proportionally higher weight when aggregating demand signals.

### Fields Used

| Our Field | Source Field (candidate names) | Notes |
|-----------|-------------------------------|-------|
| `state` | `state_name`, `state`, `State` | Normalised via `geo_aliases.json` |
| `district` | `district_name`, `district`, `District` | Fuzzy-matched to our canonical districts |
| `registered_workers_total` | `registered_workers`, `total_workers`, `worker_count` | Core count |
| `male` / `female` | `male`, `female` | Gender breakdown |
| `age_18_40` / `age_40_plus` | `age_18_40`, `18_40` | Age breakdown |
| `sc` / `st` / `obc` / `general` | `sc`, `st`, `obc`, `general` | Category breakdown |

Run `python backend/scripts/inspect_eshram.py` with your real API key to discover the actual field names for your resource ID.

### Failure Behaviour

1. Try live fetch from `data.gov.in` (10 s timeout, 2 retries with backoff).
2. Serve latest SQLite snapshot from `api_cache` table (if within TTL).
3. Fall back to synthetic data generated with `random.Random(42)`.

Every response includes `{"source": "live"|"cached"|"synthetic", "snapshot_date": "...", "fetched_at": "..."}`.

---

## 2. News Feed

| Attribute | Value |
|-----------|-------|
| **Provider options** | `newsapi` (newsapi.org), `gnews` (gnews.io), `rss` (public feeds — no key required) |
| **Active default** | `rss` (set `NEWS_PROVIDER` in `.env`) |
| **RSS feeds** | PIB India Labour, Google News RSS for labour/skilling terms |
| **Filter** | Keyword include/exclude list in `backend/lmis_config/news_keywords.py` |
| **Cache TTL** | 30 minutes (`NEWS_CACHE_TTL_MINUTES`) — in-memory cache |
| **Fallback** | RSS → bundled seed file (`backend/seed/news_fallback.json`, 8 sample items) |
| **License** | Content belongs to original publishers; only headlines/summaries shown with attribution |
| **Attribution** | Each item includes `source_name` and `url`; UI opens links in new tab with `rel="noopener noreferrer"` |

### Keyword Filtering

All filtering is in `backend/lmis_config/news_keywords.py`:
- **INCLUDE_KEYWORDS** — relevance score: title match ×3, description match ×1.
- **EXCLUDE_KEYWORDS** — any match discards the item (e.g., "Labour Party" UK politics, cricket, Bollywood).
- **TRUSTED_SOURCE_BOOST** — +2 relevance for items from PIB, Economic Times, The Hindu, etc.
- Items are sorted by `(published_at desc, relevance desc)` and capped at `NEWS_MAX_ITEMS`.

### Failure Behaviour

1. Try configured provider (newsapi/gnews) if key is set.
2. Fallback to RSS provider (always available, no key).
3. Fallback to bundled seed file (`source: "synthetic"`).

---

## 3. Legacy Connectors (Synthetic / Stub)

These connectors generate synthetic data for demonstration. They are clearly labelled `source: "synthetic"`.

| Connector | Description |
|-----------|-------------|
| **PLFS** | Periodic Labour Force Survey — synthetic district-level unemployment indicators |
| **NCS** | National Career Service — synthetic job posting signals |
| **Training** | ITI/VTP training seat capacity — synthetic supply-side data |
| **Job Portal** | Aggregated job portal demand signals — synthetic |
| **e-Shram (legacy)** | Old stub connector; superseded by the live `eshram.py` connector in Phase 2 |

To activate a legacy connector with real data, implement `fetch_data()` in its respective file in `backend/connectors/`.
