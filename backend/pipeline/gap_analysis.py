"""
gap_analysis.py — Demand-supply gap scoring for AI-LMIS pipeline.

Formula: gap_pct = (forecast_demand - forecast_supply) / max(forecast_demand, 1e-6)
Bands and severity scores explained in docs/METHODOLOGY.md §6.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import SessionLocal

# Configurable band thresholds
GAP_BANDS = {
    "Critical Shortage":   (0.50, float("inf")),
    "Shortage":            (0.20, 0.50),
    "Balanced":            (-0.20, 0.20),
    "Oversupply":          (-0.50, -0.20),
    "Critical Oversupply": (float("-inf"), -0.50),
}


def classify_band(gap_pct: float) -> str:
    for band, (lo, hi) in GAP_BANDS.items():
        if lo <= gap_pct <= hi:
            return band
    return "Balanced"


def severity(gap_pct: float) -> float:
    """0–100 severity score. Not a calibrated probability."""
    return min(abs(gap_pct) * 100, 100.0)


def run(db=None):
    close_after = db is None
    if db is None:
        db = SessionLocal()

    print("  [gap_analysis] Computing demand-supply gaps...")

    try:
        db.execute(text("DELETE FROM gap_scores"))
        db.commit()

        # Get all forecast pairs (demand + supply) per district/occupation/month
        rows = db.execute(text("""
            SELECT f_d.district_id, f_d.occupation_id, f_d.target_month,
                   f_d.point_forecast AS demand_fc,
                   COALESCE(f_s.point_forecast, 0.3) AS supply_fc
            FROM forecasts f_d
            LEFT JOIN forecasts f_s
                ON  f_d.district_id   = f_s.district_id
                AND f_d.occupation_id = f_s.occupation_id
                AND f_d.target_month  = f_s.target_month
                AND f_s.forecast_type = 'supply'
            WHERE f_d.forecast_type = 'demand'
            ORDER BY f_d.district_id, f_d.occupation_id, f_d.target_month
        """)).fetchall()

        gap_rows = []
        for district_id, occupation_id, month, demand_fc, supply_fc in rows:
            d = demand_fc if demand_fc is not None else 0.0
            s = supply_fc if supply_fc is not None else 0.0
            denom = max(d, 1e-6)
            gap_pct = (d - s) / denom
            band = classify_band(gap_pct)
            sev = severity(gap_pct)

            gap_rows.append({
                "did": district_id, "oid": occupation_id,
                "month": month,
                "fd": round(d, 5), "fs": round(s, 5),
                "gap_pct": round(gap_pct, 5),
                "gap_band": band,
                "sev": round(sev, 2),
            })

        if gap_rows:
            db.execute(text("""
                INSERT INTO gap_scores
                    (district_id, occupation_id, month, forecast_demand, forecast_supply,
                     gap_pct, gap_band, severity_score, is_synthetic)
                VALUES
                    (:did, :oid, :month, :fd, :fs, :gap_pct, :gap_band, :sev, 1)
            """), gap_rows)
            db.commit()

        print(f"  [gap_analysis] Written {len(gap_rows)} gap score records.")

        # Summary by band
        band_counts = {}
        for r in gap_rows:
            band_counts[r["gap_band"]] = band_counts.get(r["gap_band"], 0) + 1
        for b, c in sorted(band_counts.items()):
            print(f"    {b}: {c}")

        return len(gap_rows)

    finally:
        if close_after:
            db.close()
