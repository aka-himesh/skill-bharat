# AI-LMIS — AI-Enabled Labour Market Intelligence System

> **Smart India Hackathon 2026 | PS 26246**  
> **Ministry of Skill Development and Entrepreneurship (MSDE)**

AI-LMIS is a decision-support intelligence platform that connects labour-market demand signals with skill training supply, projects 12-month demand-supply gaps, detects critical shortages and oversupply, and provides deterministic seat allocation recommendations across Indian districts.

---

## 📌 Implementation Status

As per project direction, the project is structured in two distinct phases:
- **Phase 1 (Completed):** Backend architecture, data pipeline, SQLite database, synthetic simulation generator, forecasting & recommendation engines, and complete REST API with single-user PIN authentication.
- **Phase 2 (Upcoming):** React/Vite dashboard interface, Skill India UI styling, interactive filter bar, charts, and internationalization.

See [PHASE_ROADMAP.md](file:///home/t13nmayyn/new/SIH26/LMIS246/Skill-bharat/PHASE_ROADMAP.md) for full phase-by-phase breakdown.

---

## 🔐 Authentication (Single-User Demo)

For demonstration, a simple PIN + password gate protects the analytical endpoints:
- **PIN:** `26246`
- **Password:** `zeroone`

Authenticate via `POST /api/auth/login` to obtain a JWT bearer token.

---

## 🛠️ Tech Stack & Architecture

- **Backend:** Python 3.10+, FastAPI, SQLite (`backend/data/lmis.db`), SQLAlchemy
- **Analytics & Forecasting:** `statsmodels` (Holt-Winters ETS), `pandas`, `numpy`, `scipy`
- **Testing:** `pytest`, `httpx`
- **Configuration:** Root `.env` driven, loaded into `/api/config`

### Project Structure
```
Skill-bharat/
├── .env.example
├── .env
├── Makefile
├── PHASE_ROADMAP.md
├── README.md
├── docs/
│   └── METHODOLOGY.md
├── backend/
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── auth.py
│   ├── main.py
│   ├── requirements.txt
│   ├── data/
│   │   └── lmis.db
│   ├── connectors/          # Source adapters (PLFS, NCS, e-Shram, PMKVY, Portals)
│   ├── seed/                # Idempotent synthetic data generator
│   ├── pipeline/            # Demand index, forecasting, gaps, alerts, recommendations
│   ├── routers/             # FastAPI modular endpoints
│   └── tests/               # Seed, pipeline, and API test suites
└── frontend/                # Phase 2 UI (React/Vite/TS)
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites & Environment Setup
```bash
# Clone and enter repo
cd Skill-bharat

# Setup virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Generate Demo Data & Run Analytical Pipeline
```bash
# Generate 36 months of reproducible synthetic data across 4 states, 24 districts, 60 occupations
python -m seed.generate  # (or `make seed` from backend)

# Run full statistical pipeline: Demand Index → Forecasting → Gaps → Alerts → Recommendations
python -m pipeline.run   # (or `make pipeline` from backend)
```

### 3. Start the API Server
```bash
cd backend
uvicorn main:app --reload --port 8000
```
Interactive API docs are available at: `http://localhost:8000/api/docs`.

### 4. Start the Frontend (separate terminal)
The Vite development server proxies `/api/*` requests to the FastAPI server on port 8000. Keep both processes running while using the site; if FastAPI is stopped, the browser will show `502 Bad Gateway` for API requests.
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```
Open `http://localhost:5173`. Check `http://127.0.0.1:8000/health` if API requests return 502.

---

## 📊 Endpoints Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/config` | Application metadata, name, tagline, demo data status | ❌ No |
| `POST` | `/api/auth/login` | Login with PIN `26246` and password `zeroone` | ❌ No |
| `GET` | `/api/summary` | Dashboard KPI tiles & overall counts | ✅ Yes |
| `GET` | `/api/geo/states` | List of pilot states (UP, MH, TN, MP) | ✅ Yes |
| `GET` | `/api/geo/districts` | List of 24 pilot districts (with aspirational flag) | ✅ Yes |
| `GET` | `/api/sectors` | 10 industry sectors tracked | ✅ Yes |
| `GET` | `/api/occupations` | Searchable NCO occupation taxonomy | ✅ Yes |
| `GET` | `/api/gaps` | Demand-supply gap metrics with level & filters | ✅ Yes |
| `GET` | `/api/ranking` | Top shortage or oversupply districts/occupations | ✅ Yes |
| `GET` | `/api/gaps/export.csv` | Export complete gap analysis table to CSV | ✅ Yes |
| `GET` | `/api/forecast` | Historical series + 12-month demand/supply forecast | ✅ Yes |
| `GET` | `/api/alerts` | Rule-based early warning flags | ✅ Yes |
| `GET` | `/api/recommendations` | Deterministic seat adjustment recommendations | ✅ Yes |
| `GET` | `/api/recommendations/export.csv` | Export targets and seat adjustments to CSV | ✅ Yes |
| `GET` | `/api/sources/status` | Real-time connector status & provenance info | ✅ Yes |
| `GET` | `/api/methodology` | Detailed methodology summary | ✅ Yes |

---

## 🧪 Testing

Run all unit and integration tests:
```bash
cd backend
pytest tests/ -v
```
Tests cover:
- Seed generator idempotency and synthetic provenance tags.
- Demand index bounds, gap band classifications, and mathematical safety (no division by zero).
- Full endpoint security, JWT verification, and export file content generation.

---

## 📖 Methodology & Data Provenance

All formulas, statistical considerations (winsorization, Holt-Winters ETS, prediction intervals), and source adapter replacement instructions are thoroughly documented in [docs/METHODOLOGY.md](file:///home/t13nmayyn/new/SIH26/LMIS246/Skill-bharat/docs/METHODOLOGY.md).
