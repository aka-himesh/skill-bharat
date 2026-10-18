# AI-LMIS — Phase 1 & Phase 2 Roadmap & Progress

## Executive Summary
This document tracks the phased implementation of the **AI-Enabled Labour Market Intelligence System (AI-LMIS)** for SIH 2026 (PS 26246, MSDE).

As requested, the work is strictly decoupled into two major phases:
- **Phase 1: Core Engine, Backend, Data Architecture & APIs** (Focus: Robustness, Transparency, Pipeline, Auth)
- **Phase 2: UI/UX, Government Dashboard Interface, Drill-down, Visualizations & Multilingual Support**

---

## Single-User Demo Authentication (Phase 1 Implemented)
- **PIN:** `26246`
- **Password:** `zeroone`
- JWT issued on `/api/auth/login` and valid for 24 hours.
- Direct PIN + password gate required before viewing dashboard data.

---

## Phase 1 Checklist (Backend & Core Systems)

| Component | Status | Details |
| :--- | :---: | :--- |
| **Project Root & Env Config** | ✅ Completed | `.env`, `.env.example`, `Makefile` created. App name & credentials configurable. |
| **SQLite Schema & Models** | ✅ Completed | Models for States, Districts, Sectors, Occupations, Training Centres, Training Capacity, Demand Signals, Demand Index, Forecasts, Forecast Runs, Gap Scores, Alerts, Recommendations, Data Sources, Data Imports. |
| **Source Adapters** | ✅ Completed | Connectors for PLFS, NCS, e-Shram, PMKVY/Training, Job Portals with status & metadata. |
| **Seed Generator** | ✅ Completed | `seed.generate` creates 4 pilot states (UP, MH, TN, MP), 24 districts, 10 sectors, 60 occupations, 36 months history, 5 signal streams. Idempotent & tagged synthetic. |
| **Demand Index Pipeline** | ✅ Completed | Outlier winsorization, min-max scaling, source weighting (0.30/0.25/0.20/0.15/0.10), recency factor. |
| **Forecasting Engine** | ✅ Completed | Statsmodels Holt-Winters / Exponential Smoothing (or Seasonal Naïve fallback), 12-month horizon, 80% prediction intervals, holdout validation. |
| **Demand-Supply Gap Engine** | ✅ Completed | Relative gap calculation, band classification (Critical Shortage, Shortage, Balanced, Oversupply, Critical Oversupply), 0-100 severity score. |
| **Early Warning Alerts** | ✅ Completed | Rules for sustained demand growth, training capacity excess, approaching shortage / oversupply. |
| **Recommendation Engine** | ✅ Completed | Deterministic rule-based seat increase/reduction/reallocation & new course suggestions. |
| **FastAPI REST Endpoints** | ✅ Completed | Config, Auth, Geo, Sectors, Occupations, Summary, Gaps, Forecasts, Trends, Alerts, Recommendations, Sources, Methodology. |
| **CSV & JSON Exports** | ✅ Completed | Streaming CSV exports for gap analysis and training targets recommendations. |
| **Automated Tests** | ✅ Completed | Pytest test suite covering seed idempotency, pipeline calculations, and API security/routes. |
| **Methodology Documentation** | ✅ Completed | Comprehensive `docs/METHODOLOGY.md` explaining formulas, assumptions, limitations, and real-source connector roadmap. |

---

## Phase 2 Checklist (Frontend UI/UX & Visuals — Upcoming)

| Component | Status | Description |
| :--- | :---: | :--- |
| **Simple PIN/Password Login Modal** | ⏳ Phase 2 | Clean single-screen entry asking for PIN `26246` and Password `zeroone`. |
| **Skill India Dashboard Shell** | ⏳ Phase 2 | Government-style header, neutral placeholder mark, blue-to-green gradient filter bar, light grey-blue background. |
| **Global Filter Bar** | ⏳ Phase 2 | State, District, Aspirational toggle, Sector, Occupation, Forecast Horizon. |
| **KPI Tiles & Overview** | ⏳ Phase 2 | Coloured government dashboard KPI cards: coverage, critical shortages, oversupply, open alerts, seat recommendations. |
| **District Tile-Grid Heatmap** | ⏳ Phase 2 | Schematic severity view across pilot districts. |
| **Demand–Supply & Forecast View** | ⏳ Phase 2 | Chart cards (history vs 12-month forecast + 80% uncertainty bounds), source contribution breakdowns. |
| **Alerts Management UI** | ⏳ Phase 2 | Severity-badged alerts with rule breakdown and local acknowledgement state. |
| **Recommendations Table & Export** | ⏳ Phase 2 | Actionable target-setting table with one-click CSV download. |
| **Data Sources & Transparency Tab** | ⏳ Phase 2 | Live status of connectors, distinguishing synthetic demo data from official sources. |
| **Internationalization (i18n)** | ⏳ Phase 2 | English, Hindi (हिन्दी), and Marathi (मराठी) with local storage persistence. |
| **Accessibility & A11y** | ⏳ Phase 2 | High contrast toggle, font scaling, keyboard navigation, ARIA tags. |
