# AI-LMIS — Phase 2 Prompt & Implementation Guide

> Copy the prompt block below and feed it into your next chat session / agent prompt to execute **Phase 2 (Frontend UI/UX, Dashboard, Charts, and Auth Modal)**.

---

```markdown
# TASK: AI-LMIS Phase 2 — Frontend UI/UX, Skill India Government Dashboard & Single-User Auth

Smart India Hackathon 2026 | PS 26246 | Ministry of Skill Development and Entrepreneurship (MSDE)
Repository: /home/t13nmayyn/new/SIH26/LMIS246/Skill-bharat

## CONTEXT & CURRENT STATUS
Phase 1 is complete! The backend is fully built, tested, and configured:
- FastAPI running on port 8000 (SQLite at `backend/data/lmis.db`).
- All REST endpoints are ready (`/api/config`, `/api/auth/login`, `/api/summary`, `/api/geo/*`, `/api/sectors`, `/api/occupations`, `/api/gaps`, `/api/ranking`, `/api/forecast`, `/api/alerts`, `/api/recommendations`, `/api/sources/status`, `/api/methodology`, CSV exports).
- Auth mechanism: Single-user PIN + password login endpoint (`POST /api/auth/login`).
  - PIN: 26246
  - Password: zeroone
  - Returns JWT Bearer token valid for 24 hours.
- Backend configuration is fetched via public endpoint `GET /api/config`.
- Documentation: `docs/METHODOLOGY.md` and `PHASE1_SUMMARY.md`.

## YOUR ROLE IN PHASE 2
Act as a Senior Frontend Engineer and UI/UX Designer. Build a clean, responsive, demo-ready government dashboard inspired by Skill India / PMKVY dashboards using React, Vite, TypeScript, TailwindCSS, and Lucide Icons / Recharts.

---

## 1. AUTHENTICATION GATE (SIMPLE SINGLE-USER)
- When a user opens the application, display a clean modal / login screen.
- Inputs required:
  - PIN input (defaults to or accepts `26246`)
  - Password input (accepts `zeroone`)
  - "Enter AI-LMIS Dashboard" button.
- Call `POST /api/auth/login` on the backend.
- On success, store the JWT token in `localStorage` and display the dashboard.
- If the token is already present and valid, bypass the login screen directly into the dashboard. Provide a simple "Logout" button in the header.

---

## 2. BRANDING & HEADER (DYNAMIC CONFIG)
- Fetch application metadata at startup from `GET /api/config`.
- Display:
  - Configured `app_name` (AI-LMIS) and `app_tagline`.
  - Neutral placeholder ministry emblem / SVG badge (no unauthorized official logos).
  - Prominent "Demo Data — Synthetic" badge.
  - Search bar, help modal, and language selector dropdown.

---

## 3. UI LANGUAGE & DESIGN LANGUAGE (SKILL INDIA STYLE)
- **Palette & Styling:**
  - White clean header with subtle border.
  - Blue-to-green gradient filter band (`from-blue-700 to-emerald-600` or similar).
  - Light grey-blue background (`bg-slate-50` / `bg-blue-50/30`).
  - White chart cards with compact headings, clean borders, and soft shadows.
  - Government reporting KPI tiles with high-contrast indicator badges.
  - Tricolour accent bar at the footer (Saffron-White-Green subtle stripe).

---

## 4. GLOBAL FILTER BAR
Implement interactive filters synced with backend endpoints:
1. **State:** All / Uttar Pradesh / Maharashtra / Tamil Nadu / Madhya Pradesh (`GET /api/geo/states`)
2. **District:** Dynamic based on selected state (`GET /api/geo/districts?state_id=`)
3. **Aspirational District Only:** Toggle checkbox
4. **Sector:** Dropdown (`GET /api/sectors`)
5. **Occupation / Job Role:** Searchable dropdown (`GET /api/occupations`)
6. **Forecast Horizon:** 3M / 6M / 12M selector
7. **Reset / Clear Filters** button
- All charts, KPI tiles, rankings, and tables must update when filters change.
- Show breadcrumbs: `India > [State] > [District] > [Sector] > [Occupation]`.

---

## 5. DASHBOARD NAVIGATION TABS

### Tab 1: Overview
- **KPI Summary Cards:**
  - Pilot States & Districts covered (4 States, 24 Districts)
  - Critical Shortage Occupations count (with red alert badge)
  - Oversupply Occupations count (with amber warning badge)
  - Active Early Warning Alerts count
  - Net Suggested Seat Adjustments (+ seats vs - seats)
- **Top Rankings Table:**
  - Top 5 Shortage occupations (e.g. Solar Installation, Phlebotomy, CCTV Technician)
  - Top 5 Oversupply occupations (e.g. Data Entry, Tailoring, Retail Sales)
- **Schematic District Grid:**
  - Visual district tiles showing severity status (Critical Shortage / Balanced / Oversupply).

### Tab 2: Demand–Supply Analysis
- Side-by-side comparison of labour demand signals vs training supply.
- Historical trend chart (last 36 months) vs future projected gap.
- Source contribution breakdown (Job Portals 30%, NCS 25%, Industry 20%, e-Shram 15%, PLFS 10%).
- Data table alternative for accessibility.

### Tab 3: Forecast & Predictions
- Selected occupation's historical demand curve.
- 12-month forward forecast with 80% prediction interval shading.
- Clear annotation of model used (`Holt-Winters ETS` or `Seasonal Naive`).
- Explicit limitation notice: *"All predictions based on demonstration data"*.

### Tab 4: Early Warning Alerts
- Alert cards badged by severity: `Critical`, `High`, `Medium`, `Low`.
- Shows trigger rule (e.g., `sustained_demand_growth`, `capacity_excess`, `approaching_shortage`).
- Supporting evidence JSON presented cleanly in bullet points.
- Local UI "Acknowledge" button with a label stating *"Acknowledged locally for this session"*.

### Tab 5: Recommendations & Planning Targets
- Actionable seat allocation table:
  - District, Occupation, Suggested Action (Increase Seats, Reduce Seats, Reallocate, Introduce Course).
  - Estimated seat change (e.g., `+30 seats`, `-15 seats`).
  - Underlying evidence & planning assumptions.
- **Export to CSV:** Direct download button calling `/api/recommendations/export.csv`.

### Tab 6: Methodology & Transparency
- Step-by-step pipeline diagram explaining how signals transform into decisions.
- Live Connector Status panel (`/api/sources/status`) showing `mock`/`stub` status and real integration guide.

---

## 6. MULTILINGUAL SUPPORT (i18n)
- Support **English**, **Hindi (हिन्दी)**, and **Marathi (मराठी)**.
- Store language choice in `localStorage`.
- Translate navigation labels, filter titles, KPI badges, and core UI strings.

---

## 7. RUNNING & VERIFICATION
- Setup `frontend` folder with Vite + React + TypeScript.
- Use `npm install` and verify `npm run dev` starts on port 5173.
- Verify logging in with PIN `26246` and password `zeroone` unlocks the dashboard and loads data from backend `http://localhost:8000`.
```
