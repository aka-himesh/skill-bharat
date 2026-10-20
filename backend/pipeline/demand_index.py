"""
demand_index.py — Demand index builder for AI-LMIS pipeline.

Combines 5 synthetic demand signals into a weighted composite index.
Weights are prototype values — not statistically validated constants.
See docs/METHODOLOGY.md §3 for full explanation.
"""
import json
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import SessionLocal

# Configurable source weights (must sum to 1.0 across all sources)
SOURCE_WEIGHTS = {
    "job_portal":      0.30,
    "ncs":             0.25,
    "industry_hiring": 0.20,
    "eshram":          0.15,
    "plfs":            0.10,
}

RECENCY_WINDOW_MONTHS = 6
RECENCY_FACTOR = 1.2
MIN_OBSERVATIONS = 3   # Minimum non-null points to use a series


def _winsorize(values: list[float], lower_pct=5, upper_pct=95) -> list[float]:
    """Clip values at lower and upper percentiles."""
    if len(values) < 2:
        return values
    sorted_v = sorted(values)
    n = len(sorted_v)
    lo = sorted_v[max(0, int(n * lower_pct / 100))]
    hi = sorted_v[min(n - 1, int(n * upper_pct / 100))]
    return [max(lo, min(hi, v)) for v in values]


def _minmax(values: list[float]) -> list[float]:
    """Min-max normalize to [0, 1]. Returns 0.5 for constant series."""
    vmin, vmax = min(values), max(values)
    if vmax - vmin < 1e-9:
        return [0.5] * len(values)
    return [(v - vmin) / (vmax - vmin) for v in values]


def run(db=None):
    """Build demand index from demand_signals and write to demand_index table."""
    close_after = db is None
    if db is None:
        db = SessionLocal()

    print("  [demand_index] Loading demand signals...")

    try:
        # A live connector must never make seeded demo rows look like live input.
        # When a source is live, only rows bearing its matching provenance count.
        live_provenance = {}
        try:
            from adapters.source_registry import get_source_statuses
            for status in get_source_statuses():
                if status.get("status") in {"LIVE", "CACHED", "STALE"}:
                    if status["source"] == "live_mospi":
                        live_provenance["plfs"] = "live_mospi"
                    elif status["source"] == "live_ncs":
                        live_provenance["ncs"] = "live_ncs"
                    elif status["source"] == "live_datagov":
                        live_provenance["eshram"] = "live_datagov"
        except Exception:
            # Preserve normal demo operation if connector status cannot be read.
            live_provenance = {}

        # Get all distinct (district_id, occupation_id) combos
        combos = db.execute(text(
            "SELECT DISTINCT district_id, occupation_id FROM demand_signals"
        )).fetchall()

        all_months_q = db.execute(text(
            "SELECT DISTINCT month FROM demand_signals ORDER BY month"
        )).fetchall()
        all_months = [r[0] for r in all_months_q]

        print(f"  [demand_index] {len(combos)} district-occupation combos, {len(all_months)} months")

        # Build global per-source normalization ranges
        print("  [demand_index] Computing global normalization ranges...")
        source_ranges = {}
        for src in SOURCE_WEIGHTS:
            required_provenance = live_provenance.get(src)
            if required_provenance:
                rows = db.execute(text(
                    "SELECT raw_value FROM demand_signals WHERE source_name=:src AND provenance=:provenance AND raw_value IS NOT NULL"
                ), {"src": src, "provenance": required_provenance}).fetchall()
            else:
                rows = db.execute(text(
                    "SELECT raw_value FROM demand_signals WHERE source_name=:src AND raw_value IS NOT NULL"
                ), {"src": src}).fetchall()
            vals = [r[0] for r in rows]
            if len(vals) < MIN_OBSERVATIONS:
                source_ranges[src] = None
                continue
            winsorized = _winsorize(vals)
            source_ranges[src] = (min(winsorized), max(winsorized))

        # Clear existing demand_index
        db.execute(text("DELETE FROM demand_index"))
        db.commit()

        inserted = 0
        recent_months = set(all_months[-RECENCY_WINDOW_MONTHS:])

        for district_id, occupation_id in combos:
            # Load signals grouped by source
            rows = db.execute(text("""
                SELECT source_name, month, raw_value, provenance FROM demand_signals
                WHERE district_id=:did AND occupation_id=:oid
                ORDER BY month
            """), {"did": district_id, "oid": occupation_id}).fetchall()

            # Organise into month -> source -> value
            month_data: dict[str, dict[str, float | None]] = {}
            for src, month, val, provenance in rows:
                required_provenance = live_provenance.get(src)
                if required_provenance and provenance != required_provenance:
                    continue
                if month not in month_data:
                    month_data[month] = {}
                month_data[month][src] = val

            for month in all_months:
                src_vals = month_data.get(month, {})
                available_sources = []
                normed = {}

                for src, w in SOURCE_WEIGHTS.items():
                    raw = src_vals.get(src)
                    if raw is None or source_ranges[src] is None:
                        continue
                    vmin, vmax = source_ranges[src]
                    if vmax - vmin < 1e-9:
                        n_val = 0.5
                    else:
                        n_val = (raw - vmin) / (vmax - vmin)
                        n_val = max(0.0, min(1.0, n_val))
                    normed[src] = n_val
                    available_sources.append(src)

                if not available_sources:
                    continue

                # Renormalize weights over available sources
                total_w = sum(SOURCE_WEIGHTS[s] for s in available_sources)
                adj_weights = {s: SOURCE_WEIGHTS[s] / total_w for s in available_sources}

                # Recency factor
                rec = RECENCY_FACTOR if month in recent_months else 1.0

                index_val = sum(adj_weights[s] * normed[s] * rec for s in available_sources)
                # Clip to [0, 1]
                index_val = max(0.0, min(1.0, index_val))

                db.execute(text("""
                    INSERT INTO demand_index
                        (district_id, occupation_id, month, index_value,
                         contributing_sources, weights_used, is_synthetic)
                    VALUES (:did, :oid, :month, :iv, :cs, :wu, 1)
                """), {
                    "did": district_id, "oid": occupation_id,
                    "month": month, "iv": round(index_val, 5),
                    "cs": json.dumps(available_sources),
                    "wu": json.dumps({s: round(adj_weights[s], 4) for s in available_sources}),
                })
                inserted += 1

            if inserted % 5000 == 0 and inserted > 0:
                db.commit()

        db.commit()
        print(f"  [demand_index] Written {inserted} demand index records.")
        return inserted

    finally:
        if close_after:
            db.close()
