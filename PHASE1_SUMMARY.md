# AI-LMIS — Phase 1 Summary & Handover Report

**Project:** AI-Enabled Labour Market Intelligence System (AI-LMIS)  
**Smart India Hackathon 2026 | PS 26246 | Ministry of Skill Development and Entrepreneurship (MSDE)**  
**Status:** Phase 1 Complete (Backend Core Architecture, Data Pipeline, Models, Auth & APIs)  
**Date:** 2026-10-18

---

## 1. What Was Built in Phase 1

### 1.1 Architecture & Project Layout
- Created the two-tier structure: `/backend` (Python/FastAPI/SQLite) and `/frontend` (ready for Phase 2).
- Root environment configuration files: [.env.example](file:///home/t13nmayyn/new/SIH26/LMIS246/Skill-bharat/.env.example) and [.env](file:///home/t13nmayyn/new/SIH26/LMIS246/Skill-bharat/.env).
- [Makefile](file:///home/t13nmayyn/new/SIH26/LMIS246/Skill-bharat/Makefile) with targets for setup, seed, pipeline, dev server, test, and clean.

### 1.2 Database & Data Provenance (SQLite)
- Database path: `backend/data/lmis.db`.
- ORM models in [backend/models.py](file:///home/t13nmayyn/new/SIH26/LMIS246/Skill-bharat/backend/models.py):
  - **Geography & Master:** `states`, `districts` (with `is_aspirational`), `sectors`, `occupations` (with `nco_code`, `nsqf_level`, `is_uncertain`).
  - **Training Supply:** `training_centres`, `training_capacity` (sanctioned seats, enrolled, certified, placed).
  - **Demand & Analytics:** `demand_signals`, `demand_index`, `forecasts` (with 80% prediction bounds), `forecast_runs`, `gap_scores` (with band & severity), `alerts`, `recommendations`.
  - **Transparency Registry:** `data_sources`, `data_imports` (tagging provenance: `synthetic`, `official`, `stub`).

### 1.3 Single-User Demo Authentication
- Direct PIN + password gate implemented in [backend/auth.py](file:///home/t13nmayyn/new/SIH26/LMIS246/Skill-bharat/backend/auth.py):
  - **PIN:** `26246`
  - **Password:** `zeroone`
- Issues a JWT Bearer Token valid for 24 hours.
- `GET /api/config` is public (returns app branding & metadata). All other operational endpoints require the JWT token.

### 1.4 Source Adapters (`backend/connectors/`)
- Unified interface `BaseConnector` (`get_status()`, `get_metadata()`, `fetch_data()`).
- Documented mock/stub adapters for:
  - `plfs_connector.py` (MoSPI / PLFS contextual indicators)
  - `ncs_connector.py` (National Career Service job demand)
  - `eshram_connector.py` (Unorganised worker registry context)
  - `training_connector.py` (Skill India / PMKVY training data)
  - `job_portal_connector.py` (Simulated job portal vacancies)

### 1.5 Analytical Engine (`backend/pipeline/`)
- **Demand Index:** Outlier winsorization, min-max scaling, configurable source weights (`job_portal: 0.30`, `ncs: 0.25`, `industry: 0.20`, `eshram: 0.15`, `plfs: 0.10`), recency weighting.
- **Forecasting:** Independent demand and supply forecasting with 80% prediction intervals and holdout validation.
- **Gap Analysis:** `gap_pct = (demand - supply) / max(demand, 1e-6)`. Classified into 5 bands: *Critical Shortage*, *Shortage*, *Balanced*, *Oversupply*, *Critical Oversupply*. Severity score 0–100.
- **Alerts Engine:** Configurable early warnings for sustained demand growth, capacity excess, and approaching shortage/oversupply.
- **Recommendation Engine:** Rule-based deterministic seat adjustment (+20% / -15%), course reallocation, new course introduction, and seasonal curriculum review.

### 1.6 FastAPI Endpoints (`backend/routers/`)
- `GET /api/config` (Public)
- `POST /api/auth/login` (Public login with PIN `26246` & Password `zeroone`)
- `GET /api/summary` (KPI counters)
- `GET /api/geo/states` & `GET /api/geo/districts`
- `GET /api/sectors` & `GET /api/occupations`
- `GET /api/gaps` (with national/state/district drill-down)
- `GET /api/ranking` (top shortage/oversupply)
- `GET /api/forecast` & `GET /api/trend`
- `GET /api/alerts`
- `GET /api/recommendations`
- `GET /api/gaps/export.csv` & `GET /api/recommendations/export.csv`
- `GET /api/sources/status` & `GET /api/methodology`

### 1.7 Documentation
- [docs/METHODOLOGY.md](file:///home/t13nmayyn/new/SIH26/LMIS246/Skill-bharat/docs/METHODOLOGY.md) (Complete statistical and provenance methodology)
- [README.md](file:///home/t13nmayyn/new/SIH26/LMIS246/Skill-bharat/README.md) (Quickstart and architecture)
- [PHASE_ROADMAP.md](file:///home/t13nmayyn/new/SIH26/LMIS246/Skill-bharat/PHASE_ROADMAP.md) (High-level phase tracking)

---

## 2. Note on Dataset Size for Demo Speed

The initial pilot configuration ran across 24 districts × 60 occupations × 36 months = 51,840 series points. While accurate for a full data platform, running Holt-Winters fitting across all 1,440 time series during demonstration takes several minutes. 

For Phase 2 demo purposes, the seed generator can be calibrated to a lightweight pilot (e.g. 2 key districts per state and 15 representative occupations across the core scenarios) to ensure near-instant 2-second pipeline execution.
