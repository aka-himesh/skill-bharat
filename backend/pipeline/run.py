"""
run.py — Pipeline orchestrator for AI-LMIS.

Runs all analytical steps in order:
  1. Demand Index
  2. Forecasting
  3. Gap Analysis
  4. Alerts
  5. Recommendations

Run from backend/ directory:
    python -m pipeline.run
"""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from database import init_db, SessionLocal
from pipeline import demand_index, forecasting, gap_analysis, alerts, recommendations


def run_pipeline():
    print("=" * 60)
    print("AI-LMIS Analytical Pipeline")
    print(f"Started: {datetime.utcnow().isoformat()}Z")
    print("=" * 60)

    init_db()
    db = SessionLocal()

    steps = [
        ("Demand Index",      demand_index.run),
        ("Forecasting",       forecasting.run),
        ("Gap Analysis",      gap_analysis.run),
        ("Alerts",            alerts.run),
        ("Recommendations",   recommendations.run),
    ]

    results = {}
    total_start = time.time()

    try:
        for name, fn in steps:
            print(f"\n-- {name} --")
            t0 = time.time()
            count = fn(db)
            elapsed = time.time() - t0
            results[name] = {"count": count, "elapsed_s": round(elapsed, 2)}
            print(f"  Done in {elapsed:.2f}s - {count} records")

    except Exception as e:
        db.rollback()
        print(f"\nPIPELINE ERROR in step: {e}")
        raise
    finally:
        db.close()

    total = time.time() - total_start
    print("\n" + "=" * 60)
    print(f"Pipeline complete in {total:.2f}s")
    print("=" * 60)
    for name, r in results.items():
        print(f"  {name:<25}: {r['count']:>8} records  ({r['elapsed_s']}s)")
    print()


if __name__ == "__main__":
    run_pipeline()
