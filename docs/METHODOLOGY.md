# AI-LMIS — Methodology Document

**Version:** 1.0.0-phase1  
**Last Updated:** 2026-10-18  
**Status:** Prototype — All forecasts and gap scores use synthetic demonstration data

---

> **⚠ IMPORTANT DISCLAIMER**  
> This system is a proof-of-concept prototype built for the Smart India Hackathon 2026.  
> All analytical outputs are based on synthetic demonstration data unless explicitly marked as official.  
> Do not use these outputs for actual policy decisions without replacement of synthetic data with validated official sources.

---

## 1. Overview of the Pipeline

```
Raw Data Sources
      │
      ▼
Source Adapters (connectors/)
      │  [normalize, validate, tag provenance]
      ▼
Demand Signals Table
      │
      ▼
Demand Index Builder (pipeline/demand_index.py)
      │  [weight, winsorize, normalize, combine]
      ▼
Demand Index Table
      │
      ▼
Forecasting Engine (pipeline/forecasting.py)
      │  [ETS / Holt-Winters or Seasonal Naive]
      ▼
Forecasts Table
      │
      ▼
Gap Analysis (pipeline/gap_analysis.py)
      │  [gap_pct, band classification, severity]
      ▼
Gap Scores Table
      │
      ▼
Alert Engine (pipeline/alerts.py)
      │  [configurable rule triggers]
      ▼
Alerts Table
      │
      ▼
Recommendation Engine (pipeline/recommendations.py)
      │  [deterministic rule-based suggestions]
      ▼
Recommendations Table
      │
      ▼
REST API (FastAPI) → Frontend Dashboard
```

---

## 2. Data Sources and Provenance

| Source | Adapter | Type | Notes |
|--------|---------|------|-------|
| Job Portal Signals | `job_portal_connector.py` | Synthetic | Simulates aggregated job-posting demand |
| NCS (National Career Service) | `ncs_connector.py` | Synthetic/Stub | Real integration requires NCS API authorization |
| Industry Hiring | `training_connector.py` | Synthetic | Simulates employer hiring intent |
| e-Shram | `eshram_connector.py` | Synthetic/Stub | Contextual indicator only; not direct vacancy count |
| PLFS / MoSPI | `plfs_connector.py` | Synthetic/Stub | Real integration requires MoSPI e-Sankhyiki access |

### Provenance Types
- **`official`** — Data imported from an authorized government source
- **`synthetic`** — Generated demonstration data; clearly labelled throughout UI
- **`stub`** — Real-integration connector written but not yet connected to live data

---

## 3. Demand Index Construction

### 3.1 Source Weights (Configurable)

These are **prototype starting weights** — not statistically validated constants.  
They can be edited in `pipeline/demand_index.py → SOURCE_WEIGHTS`.

| Source | Weight |
|--------|--------|
| Job Portal | 0.30 |
| NCS | 0.25 |
| Industry Hiring | 0.20 |
| e-Shram | 0.15 |
| PLFS | 0.10 |

**Note on PLFS and e-Shram:** These are labour force participation and worker-registration indicators respectively. They are treated as *contextual signals*, not direct vacancy counts. Their normalized values should not be interpreted as job demand figures.

### 3.2 Processing Steps

1. **Load raw signals** for each (district, occupation, month) combination
2. **Outlier treatment** — Winsorize each source series at the 5th and 95th percentiles
3. **Series validity check** — Skip series with fewer than 3 non-null observations; mark as sparse
4. **Min-max normalization** — Scale each source to [0, 1] across the full dataset. Uses:
   ```
   x_norm = (x - x_min) / (x_max - x_min)
   ```
   Guard: if `x_max == x_min` (constant series), set all values to 0.5
5. **Weight renormalization** — Over available sources only:
   ```
   w_adjusted[s] = w_original[s] / sum(w_original[available_sources])
   ```
6. **Recency weighting** — Observations in the most recent 6 months receive a 1.2× multiplier before combining
7. **Composite index:**
   ```
   index = sum(w_adjusted[s] * x_norm[s] * recency_factor) for each available source s
   ```
8. **Save** index value plus `contributing_sources` (JSON) and `weights_used` (JSON) per record

### 3.3 Limitations
- The composite index is a relative indicator of demand pressure, not an absolute vacancy count.
- Combining PLFS and e-Shram as demand signals is an approximation; they measure workforce participation, not unfilled vacancies.
- Source weights are illustrative starting points requiring empirical validation.

---

## 4. Vacancy Calibration

**Current status:** Not implemented in Phase 1.

Mapping from demand index scores to estimated vacancies requires:
- A defensible calibration dataset (e.g., actual vacancy counts from NCS matched to index values)
- Consistent geography and time period
- Statistical validation of the mapping function

Until such data is available, the system displays the **demand index** as a relative measure (0–1 scale), not as a vacancy count. Synthetic scenarios include synthetic estimated vacancies explicitly labelled as such.

---

## 5. Forecasting

### 5.1 Model Selection

| Series Length | Method |
|--------------|--------|
| ≥ 18 months | ETS / Holt-Winters Exponential Smoothing (`statsmodels.tsa.holtwinters.ExponentialSmoothing`) |
| < 18 months | Seasonal Naïve (repeat last year's value for the same month) |

### 5.2 Holt-Winters Configuration
- Trend: additive
- Seasonal: additive with period = 12 (monthly)
- Initialization: estimated
- Damped trend: True (reduces over-extrapolation)

### 5.3 Prediction Intervals
- 80% prediction intervals are produced where the model supports simulation-based bounds.
- If intervals cannot be reliably estimated (e.g., degenerate variance), `lower_80` and `upper_80` are set to `null` and the limitation is recorded.

### 5.4 Validation (Time-Based Holdout)
- Last 6 months of each series are withheld as a test set.
- Model is trained on the remaining months.
- Metrics computed: MAE (Mean Absolute Error), RMSE (Root Mean Square Error)
- These are compared against a **naïve baseline** (last observed value carried forward).
- Results stored in `forecast_runs` table.

### 5.5 Supply Forecasting
Supply is projected from:
- Current sanctioned seats
- Historical enrolment and certification rates (completion rate = certified / enrolled)
- Placement rate from training records
- Assumption: trainees from current enrolments become available to the labour market after the typical training duration (assumed 3–6 months depending on occupation)

**Limitation:** This may double-count the existing certified pipeline and future cohorts. The model explicitly notes this limitation in the `notes` field of `forecast_runs`.

### 5.6 Limitations
- All forecasts based on synthetic data are illustrative, not predictions.
- ETS assumes the historical pattern continues, which may not hold for emerging occupations.
- Seasonal periods assume monthly granularity with annual seasonality.
- Short series (< 18 months) use naïve methods; treat these results with low confidence.

---

## 6. Demand–Supply Gap Analysis

### 6.1 Formula

```
gap_pct = (forecast_demand - forecast_supply) / max(forecast_demand, 1)
```

- `forecast_demand` = demand index forecast (normalized 0–1 scale) for target month
- `forecast_supply` = normalized training supply forecast
- Division by `max(forecast_demand, 1)` prevents division by zero

### 6.2 Band Classification (Configurable)

| Band | Condition |
|------|-----------|
| Critical Shortage | `gap_pct > 0.50` |
| Shortage | `0.20 < gap_pct ≤ 0.50` |
| Balanced | `-0.20 ≤ gap_pct ≤ 0.20` |
| Oversupply | `-0.50 ≤ gap_pct < -0.20` |
| Critical Oversupply | `gap_pct < -0.50` |

Thresholds are configurable in `pipeline/gap_analysis.py → GAP_BANDS`.

### 6.3 Severity Score

```
severity_score = min(abs(gap_pct) * 100, 100)
```

This is a **relative indicator of gap magnitude**, not a calibrated probability. A score of 80 means a large gap relative to the demand forecast; it does not mean 80% probability of a labour shortage.

### 6.4 Compatible Units
- Demand and supply forecasts must be on the same normalized scale before computing the gap.
- If actual seat counts and vacancy counts were available in compatible units, the formula can use absolute figures instead.

---

## 7. Early Warning Alerts

### 7.1 Configurable Rules

| Rule | Description | Threshold |
|------|-------------|-----------|
| `sustained_demand_growth` | Demand index increased for N consecutive months | N = 3 (configurable) |
| `capacity_excess` | Training seats exceed projected demand by factor X | X = 1.5× (configurable) |
| `approaching_shortage` | Gap forecast to cross shortage threshold within M months | M = 6 (configurable) |
| `approaching_oversupply` | Gap forecast to cross oversupply threshold within M months | M = 6 (configurable) |

### 7.2 Alert Structure
Each alert records:
- `rule_name` — which rule triggered
- `rule_description` — plain-English explanation
- `evidence` — JSON object with the data that triggered the rule
- `severity` — low / medium / high / critical
- `reference_period` — the time period the alert relates to
- `district_id`, `occupation_id` — affected geography and occupation

### 7.3 Limitations
- Alerts are heuristic flags, not validated statistical tests.
- The absence of an alert does not mean a situation is safe.
- All alerts in the demo are generated from synthetic data.

---

## 8. Recommendation Engine

### 8.1 Design Principle
The engine is **fully deterministic and rule-based**. No large language model (LLM) is used. This ensures reproducibility and auditability.

### 8.2 Rules

| Condition | Action |
|-----------|--------|
| Critical Shortage + stable or declining supply | Suggest seat increase (+20% of current capacity) |
| Oversupply + sustained for 3+ months | Suggest seat reduction (-15%) or reallocation to shortage occupations |
| Approaching shortage + low current supply | Suggest introducing a new course |
| High severity + seasonal pattern detected | Flag curriculum review (timing alignment) |
| Multiple shortage occupations in same district | Generate district priority ranking |

### 8.3 Constraints
- Recommended seat transfers must not violate capacity constraints (cannot reduce to below 0 seats).
- Recommendations distinguish *planning suggestions* from *approved policy decisions*.
- Projected demand is not presented as guaranteed employment.

### 8.4 Output Fields
Each recommendation includes:
- `action_type` — increase_seats / reduce_seats / reallocate / new_course / curriculum_review
- `estimated_seat_change` — signed integer (positive = increase, negative = reduction)
- `evidence` — JSON summary of the supporting data
- `assumptions` — explicit statement of assumptions made
- `confidence_note` — explicit statement of limitations and confidence level
- `data_provenance` — synthetic / official

---

## 9. Authentication

The prototype uses a **single-user PIN + password** mechanism:
- **PIN:** `26246`
- **Password:** `zeroone`

This is for demonstration purposes only. In a production system, this must be replaced with:
- Role-based access control (RBAC)
- Integration with NIC/government identity systems (e.g., SSO)
- Multi-factor authentication
- Audit logging of all access

JWT tokens are issued on successful login with a configurable expiry (default: 24 hours).

---

## 10. Data Transparency Standards

The system enforces these transparency rules throughout:

1. **Every record has provenance** — `is_synthetic` flag, `data_source` string, `created_at` timestamp
2. **No silent mixing** — Real and synthetic data are never combined into a result without labelling
3. **Source status visible** — `GET /api/sources/status` shows which connectors are active vs. mock
4. **Methodology endpoint** — `GET /api/methodology` returns a structured summary
5. **Limitations documented at every layer** — connectors, forecasts, gap scores, recommendations

---

## 11. Replacing Mock Connectors with Real Sources

### MoSPI / PLFS
1. Obtain authorized access to MoSPI e-Sankhyiki portal
2. Download PLFS unit-level or state-level CSV files
3. Use `GET /api/imports` (future endpoint) to upload CSV
4. Update `plfs_connector.py → get_status()` to return `provenance_type: 'official'`

### NCS Job Demand Data
1. Apply for NCS API access via NIC/Ministry portal
2. Add API key to `.env` as `NCS_API_KEY`
3. Update `ncs_connector.py → fetch_data()` to call the real API
4. The connector interface (`get_status`, `get_metadata`, `fetch_data`) remains unchanged

### e-Shram
1. Obtain authorized data sharing agreement
2. Replace mock in `eshram_connector.py` with authorized API or CSV import
3. Treat as contextual indicator only (worker registrations ≠ vacancies)

### Skill India / PMKVY Training Data
1. Download official PMKVY public reports from skillindiadatabank.com or official portals
2. Use the CSV import endpoint to load training centre and enrolment data
3. `training_connector.py` will be superseded by the imported data

---

## 12. Known Limitations (Phase 1)

| Item | Status |
|------|--------|
| All data is synthetic | ✅ Clearly labelled |
| No real PLFS integration | ✅ Stub connector with documentation |
| No real NCS API | ✅ Stub connector with documentation |
| District-level PLFS not available officially | ✅ Not fabricated; synthetic only |
| Vacancy calibration not implemented | ✅ Index shown as relative measure |
| Prediction intervals not available for short series | ✅ Null values returned, not fabricated |
| No PDF NCO taxonomy parsing (Phase 1) | ✅ Manual occupation list used; import mechanism provided |
| Frontend UI — Phase 2 | 🔄 Planned |
| Geographic map component | 🔄 Phase 2 (tile-grid heatmap) |
| Spreadsheet import | 🔄 Phase 2 |

---

*Document maintained by the AI-LMIS development team.*  
*For questions about methodology, refer to the source code in `backend/pipeline/`.*
