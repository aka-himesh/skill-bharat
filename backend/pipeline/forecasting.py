"""
forecasting.py — Demand & supply forecasting engine for AI-LMIS.

- Uses ETS/Holt-Winters for series >= 18 months
- Falls back to seasonal naive for shorter series
- 12-month horizon, 80% prediction intervals where available
- Time-based holdout validation (last 6 months)
- See docs/METHODOLOGY.md §5
"""
import json
import math
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from sqlalchemy import text
from database import SessionLocal

HORIZON = 12
HOLDOUT = 6
MIN_HW_SERIES = 18   # Minimum length for Holt-Winters


def _next_months(last_month: str, n: int) -> list[str]:
    """Return n months after last_month as 'YYYY-MM'."""
    y, m = int(last_month[:4]), int(last_month[5:7])
    d = date(y, m, 1)
    return [(d + relativedelta(months=i+1)).strftime("%Y-%m") for i in range(n)]


def _prev_months(ref_month: str, n: int) -> list[str]:
    """Return n months before (and including) ref_month."""
    y, m = int(ref_month[:4]), int(ref_month[5:7])
    d = date(y, m, 1)
    return [(d - relativedelta(months=n - 1 - i)).strftime("%Y-%m") for i in range(n)]


def _seasonal_naive(history: list[float], horizon: int) -> list[float]:
    """Repeat last 12 months cyclically for the forecast horizon."""
    if len(history) == 0:
        return [0.5] * horizon
    cycle = history[-12:] if len(history) >= 12 else history
    out = []
    for i in range(horizon):
        out.append(cycle[i % len(cycle)])
    return out


def _holt_winters(history: list[float], horizon: int):
    """
    Fit Holt-Winters and return (forecasts, lower_80, upper_80).
    Returns (forecasts, None, None) if fitting fails.
    """
    try:
        import warnings
        import numpy as np
        from statsmodels.tsa.holtwinters import ExponentialSmoothing

        arr = np.array(history, dtype=float)
        # Guard: replace any NaN/inf
        arr = np.where(np.isfinite(arr), arr, np.nanmedian(arr))

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            model = ExponentialSmoothing(
                arr,
                trend="add",
                seasonal="add",
                seasonal_periods=12,
                damped_trend=True,
                initialization_method="estimated",
            )
            fit = model.fit(optimized=True, remove_bias=True)

        fc = fit.forecast(horizon)
        fc = [max(0.0, min(1.0, float(v))) for v in fc]

        # Fast analytical 80% PI using residual variance (z_80 = 1.282)
        try:
            residuals = arr - fit.fittedvalues
            res_std = float(np.std(residuals)) if len(residuals) > 0 else 0.05
            # Expanding horizon uncertainty: std * sqrt(1 + 0.1 * step)
            z_80 = 1.282
            lo = [max(0.0, float(fc[i] - z_80 * res_std * math.sqrt(1 + 0.1 * (i + 1)))) for i in range(horizon)]
            hi = [min(1.0, float(fc[i] + z_80 * res_std * math.sqrt(1 + 0.1 * (i + 1)))) for i in range(horizon)]
        except Exception:
            lo, hi = [None] * horizon, [None] * horizon

        return fc, lo, hi
    except Exception:
        return None, None, None


def _mae(actual, predicted):
    pairs = [(a, p) for a, p in zip(actual, predicted) if a is not None and p is not None]
    if not pairs:
        return None
    return sum(abs(a - p) for a, p in pairs) / len(pairs)


def _rmse(actual, predicted):
    pairs = [(a, p) for a, p in zip(actual, predicted) if a is not None and p is not None]
    if not pairs:
        return None
    return math.sqrt(sum((a - p) ** 2 for a, p in pairs) / len(pairs))


def _forecast_series(history_vals: list[float | None], months: list[str]):
    """
    Forecast a single time series.
    Returns dict with keys: forecasts, lower_80, upper_80, model_name,
                             mae, rmse, baseline_mae, notes
    """
    # Fill None with linear interpolation / forward fill
    clean = []
    for v in history_vals:
        if v is not None:
            clean.append(v)
        elif clean:
            clean.append(clean[-1])   # forward fill
        else:
            clean.append(0.5)         # default if leading nulls

    n = len(clean)
    notes = []

    if n < HOLDOUT + 2:
        # Too short for any meaningful forecast
        fc = _seasonal_naive(clean, HORIZON)
        notes.append("Series too short; using seasonal naive.")
        return {
            "forecasts": fc, "lower_80": [None]*HORIZON, "upper_80": [None]*HORIZON,
            "model_name": "seasonal_naive", "mae": None, "rmse": None,
            "baseline_mae": None, "notes": "; ".join(notes)
        }

    # Holdout split
    train, test = clean[:-HOLDOUT], clean[-HOLDOUT:]

    # Try Holt-Winters if enough data
    model_name = "seasonal_naive"
    train_fc = None
    if len(train) >= MIN_HW_SERIES:
        hw_fc, hw_lo, hw_hi = _holt_winters(train, HOLDOUT)
        if hw_fc is not None:
            model_name = "holt_winters"
            train_fc = hw_fc

    if train_fc is None:
        train_fc = _seasonal_naive(train, HOLDOUT)

    # Baseline (naive carry-forward)
    baseline_fc = [train[-1]] * HOLDOUT

    # Evaluation
    mae_val = _mae(test, train_fc)
    rmse_val = _rmse(test, train_fc)
    baseline_mae = _mae(test, baseline_fc)

    if mae_val and baseline_mae:
        notes.append(f"MAE={mae_val:.4f} vs baseline={baseline_mae:.4f}")

    # Full forecast (train on all data)
    fc_vals, fc_lo, fc_hi = None, None, None
    if model_name == "holt_winters" and len(clean) >= MIN_HW_SERIES:
        fc_vals, fc_lo, fc_hi = _holt_winters(clean, HORIZON)

    if fc_vals is None:
        fc_vals = _seasonal_naive(clean, HORIZON)
        fc_lo, fc_hi = [None]*HORIZON, [None]*HORIZON
        if model_name != "seasonal_naive":
            model_name = "seasonal_naive"
            notes.append("Fell back to seasonal naive for full forecast.")

    return {
        "forecasts": fc_vals, "lower_80": fc_lo, "upper_80": fc_hi,
        "model_name": model_name, "mae": mae_val, "rmse": rmse_val,
        "baseline_mae": baseline_mae, "notes": "; ".join(notes)
    }


def run(db=None):
    close_after = db is None
    if db is None:
        db = SessionLocal()

    print("  [forecasting] Starting demand & supply forecasting...")

    try:
        # Create a forecast run record
        run_time = datetime.utcnow()
        db.execute(text("""
            INSERT INTO forecast_runs (run_date, model_used, horizon_months, notes)
            VALUES (:rd, :mu, :hm, :notes)
        """), {"rd": run_time, "mu": "holt_winters/seasonal_naive", "hm": HORIZON,
               "notes": "Pipeline run. See individual forecast records for model choice."})
        db.commit()
        run_id = db.execute(text("SELECT MAX(id) FROM forecast_runs")).scalar()

        # Clear existing forecasts for this run scope
        db.execute(text("DELETE FROM forecasts"))
        db.commit()

        combos = db.execute(text(
            "SELECT DISTINCT district_id, occupation_id FROM demand_index ORDER BY district_id, occupation_id"
        )).fetchall()

        all_months_q = db.execute(text(
            "SELECT DISTINCT month FROM demand_index ORDER BY month"
        )).fetchall()
        all_months = [r[0] for r in all_months_q]
        last_month = all_months[-1] if all_months else "2024-01"
        future_months = _next_months(last_month, HORIZON)

        total_inserted = 0
        agg_mae = []

        for district_id, occupation_id in combos:
            # ── Demand forecast ─────────────────────────────────────────
            rows = db.execute(text("""
                SELECT month, index_value FROM demand_index
                WHERE district_id=:did AND occupation_id=:oid
                ORDER BY month
            """), {"did": district_id, "oid": occupation_id}).fetchall()

            month_to_val = {r[0]: r[1] for r in rows}
            history_vals = [month_to_val.get(m) for m in all_months]

            result = _forecast_series(history_vals, all_months)

            if result["mae"] is not None:
                agg_mae.append(result["mae"])

            fc_rows = []
            for i, fm in enumerate(future_months):
                fc_rows.append({
                    "did": district_id, "oid": occupation_id,
                    "ftype": "demand", "tmonth": fm,
                    "pf": round(result["forecasts"][i], 5),
                    "lo": round(result["lower_80"][i], 5) if result["lower_80"][i] is not None else None,
                    "hi": round(result["upper_80"][i], 5) if result["upper_80"][i] is not None else None,
                    "mn": result["model_name"],
                    "mp": json.dumps({"notes": result["notes"]}),
                    "rid": run_id,
                })

            # ── Supply forecast ──────────────────────────────────────────
            # Aggregate training capacity per (district, occupation, month)
            sup_rows = db.execute(text("""
                SELECT tc.month,
                       SUM(tc.enrolled) as enrolled,
                       SUM(tc.sanctioned_seats) as seats
                FROM training_capacity tc
                JOIN training_centres ctr ON tc.centre_id = ctr.id
                WHERE ctr.district_id = :did AND tc.occupation_id = :oid
                GROUP BY tc.month ORDER BY tc.month
            """), {"did": district_id, "oid": occupation_id}).fetchall()

            if sup_rows:
                sup_map = {r[0]: (r[1] or 0) / max(r[2] or 1, 1) for r in sup_rows}
                sup_hist = [sup_map.get(m, 0.0) for m in all_months]
                # Normalize supply to [0,1] relative to max in pilot
                max_sup = max(sup_hist) if sup_hist else 1.0
                sup_norm = [v / max(max_sup, 1e-6) for v in sup_hist]
                sup_result = _forecast_series(sup_norm, all_months)
            else:
                sup_result = {
                    "forecasts": [0.3]*HORIZON, "lower_80": [None]*HORIZON,
                    "upper_80": [None]*HORIZON, "model_name": "no_data",
                    "notes": "No training capacity data for this district-occupation."
                }

            for i, fm in enumerate(future_months):
                fc_rows.append({
                    "did": district_id, "oid": occupation_id,
                    "ftype": "supply", "tmonth": fm,
                    "pf": round(sup_result["forecasts"][i], 5),
                    "lo": round(sup_result["lower_80"][i], 5) if sup_result["lower_80"][i] is not None else None,
                    "hi": round(sup_result["upper_80"][i], 5) if sup_result["upper_80"][i] is not None else None,
                    "mn": sup_result["model_name"],
                    "mp": json.dumps({"notes": sup_result.get("notes", "")}),
                    "rid": run_id,
                })

            db.execute(text("""
                INSERT INTO forecasts
                    (district_id, occupation_id, forecast_type, target_month,
                     point_forecast, lower_80, upper_80, model_name, model_params, run_id)
                VALUES (:did, :oid, :ftype, :tmonth, :pf, :lo, :hi, :mn, :mp, :rid)
            """), fc_rows)
            total_inserted += len(fc_rows)

            if total_inserted % 2000 == 0:
                db.commit()

        db.commit()

        # Update forecast run with aggregated metrics
        avg_mae = sum(agg_mae) / len(agg_mae) if agg_mae else None
        db.execute(text("""
            UPDATE forecast_runs SET evaluation_mae=:mae WHERE id=:rid
        """), {"mae": avg_mae, "rid": run_id})
        db.commit()

        print(f"  [forecasting] Written {total_inserted} forecast records (run_id={run_id}).")
        if avg_mae:
            print(f"  [forecasting] Average demand MAE: {avg_mae:.4f}")
        return total_inserted

    finally:
        if close_after:
            db.close()
