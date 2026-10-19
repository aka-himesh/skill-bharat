"""
alerts.py — Early warning alert engine for AI-LMIS pipeline.

Generates alerts from gap_scores and demand_index using configurable rules.
Each alert records the exact rule that fired and the evidence.
See docs/METHODOLOGY.md §7.
"""
import json
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from sqlalchemy import text
from database import SessionLocal

# Configurable thresholds
SUSTAINED_GROWTH_MONTHS = 3
CAPACITY_EXCESS_FACTOR = 1.5
APPROACHING_HORIZON_MONTHS = 6
SHORTAGE_THRESHOLD = 0.20
OVERSUPPLY_THRESHOLD = -0.20


def _already_exists(db, district_id, occupation_id, rule_name, reference_period):
    row = db.execute(text("""
        SELECT id FROM alerts
        WHERE district_id=:did AND occupation_id=:oid
          AND rule_name=:rn AND reference_period=:rp
    """), {"did": district_id, "oid": occupation_id, "rn": rule_name, "rp": reference_period}).fetchone()
    return row is not None


def run(db=None):
    close_after = db is None
    if db is None:
        db = SessionLocal()

    print("  [alerts] Generating early warning alerts...")

    try:
        months_q = db.execute(text(
            "SELECT DISTINCT month FROM demand_index ORDER BY month DESC LIMIT 12"
        )).fetchall()
        months_desc = [r[0] for r in months_q]

        combos = db.execute(text(
            "SELECT DISTINCT district_id, occupation_id FROM gap_scores"
        )).fetchall()

        inserted = 0
        now = datetime.utcnow()

        for district_id, occupation_id in combos:

            # Rule 1: Sustained demand growth
            if len(months_desc) >= SUSTAINED_GROWTH_MONTHS:
                check_months = months_desc[:SUSTAINED_GROWTH_MONTHS + 1]
                min_m = min(check_months)
                max_m = max(check_months)
                vals = db.execute(text("""
                    SELECT month, index_value FROM demand_index
                    WHERE district_id=:did AND occupation_id=:oid
                      AND month >= :min_m AND month <= :max_m
                    ORDER BY month DESC
                """), {"did": district_id, "oid": occupation_id,
                       "min_m": min_m, "max_m": max_m}).fetchall()
                if len(vals) >= SUSTAINED_GROWTH_MONTHS:
                    v_list = [r[1] for r in vals]
                    growing = all(v_list[i] > v_list[i+1] for i in range(SUSTAINED_GROWTH_MONTHS - 1))
                    if growing:
                        ref = check_months[0]
                        if not _already_exists(db, district_id, occupation_id, "sustained_demand_growth", ref):
                            db.execute(text("""
                                INSERT INTO alerts
                                    (district_id, occupation_id, alert_type, severity,
                                     rule_name, rule_description, evidence, reference_period, acknowledged)
                                VALUES (:did, :oid, :at, :sev, :rn, :rd, :ev, :rp, 0)
                            """), {
                                "did": district_id, "oid": occupation_id,
                                "at": "demand_trend", "sev": "medium",
                                "rn": "sustained_demand_growth",
                                "rd": f"Demand index increased for {SUSTAINED_GROWTH_MONTHS}+ consecutive months.",
                                "ev": json.dumps({
                                    "months": check_months[:SUSTAINED_GROWTH_MONTHS],
                                    "values": [round(v, 4) for v in v_list[:SUSTAINED_GROWTH_MONTHS]],
                                }),
                                "rp": ref,
                            })
                            inserted += 1

            # Rule 2: Capacity excess
            excess_months = db.execute(text("""
                SELECT month, forecast_demand, forecast_supply FROM gap_scores
                WHERE district_id=:did AND occupation_id=:oid
                  AND forecast_supply > forecast_demand * :factor
                ORDER BY month DESC LIMIT 3
            """), {"did": district_id, "oid": occupation_id,
                   "factor": CAPACITY_EXCESS_FACTOR}).fetchall()
            if len(excess_months) >= 3:
                ref = excess_months[0][0]
                if not _already_exists(db, district_id, occupation_id, "capacity_excess", ref):
                    db.execute(text("""
                        INSERT INTO alerts
                            (district_id, occupation_id, alert_type, severity,
                             rule_name, rule_description, evidence, reference_period, acknowledged)
                        VALUES (:did, :oid, :at, :sev, :rn, :rd, :ev, :rp, 0)
                    """), {
                        "did": district_id, "oid": occupation_id,
                        "at": "oversupply_risk", "sev": "high",
                        "rn": "capacity_excess",
                        "rd": f"Training supply >={CAPACITY_EXCESS_FACTOR}x projected demand for 3+ months.",
                        "ev": json.dumps({
                            "months": [r[0] for r in excess_months],
                            "demand": [round(r[1], 4) for r in excess_months],
                            "supply": [round(r[2], 4) for r in excess_months],
                        }),
                        "rp": ref,
                    })
                    inserted += 1

            # Rule 3: Approaching shortage
            future_gaps = db.execute(text("""
                SELECT month, gap_pct FROM gap_scores
                WHERE district_id=:did AND occupation_id=:oid
                ORDER BY month ASC LIMIT :lim
            """), {"did": district_id, "oid": occupation_id,
                   "lim": APPROACHING_HORIZON_MONTHS}).fetchall()
            crossing_shortage = [r for r in future_gaps if r[1] >= SHORTAGE_THRESHOLD]
            if crossing_shortage:
                ref = crossing_shortage[0][0]
                if not _already_exists(db, district_id, occupation_id, "approaching_shortage", ref):
                    db.execute(text("""
                        INSERT INTO alerts
                            (district_id, occupation_id, alert_type, severity,
                             rule_name, rule_description, evidence, reference_period, acknowledged)
                        VALUES (:did, :oid, :at, :sev, :rn, :rd, :ev, :rp, 0)
                    """), {
                        "did": district_id, "oid": occupation_id,
                        "at": "shortage_risk", "sev": "high",
                        "rn": "approaching_shortage",
                        "rd": f"Forecast crosses shortage threshold within {APPROACHING_HORIZON_MONTHS} months.",
                        "ev": json.dumps({
                            "first_crossing_month": ref,
                            "gap_pct": round(crossing_shortage[0][1], 4),
                        }),
                        "rp": ref,
                    })
                    inserted += 1

            # Rule 4: Approaching oversupply
            crossing_over = [r for r in future_gaps if r[1] <= OVERSUPPLY_THRESHOLD]
            if crossing_over:
                ref = crossing_over[0][0]
                if not _already_exists(db, district_id, occupation_id, "approaching_oversupply", ref):
                    db.execute(text("""
                        INSERT INTO alerts
                            (district_id, occupation_id, alert_type, severity,
                             rule_name, rule_description, evidence, reference_period, acknowledged)
                        VALUES (:did, :oid, :at, :sev, :rn, :rd, :ev, :rp, 0)
                    """), {
                        "did": district_id, "oid": occupation_id,
                        "at": "oversupply_risk", "sev": "medium",
                        "rn": "approaching_oversupply",
                        "rd": f"Forecast crosses oversupply threshold within {APPROACHING_HORIZON_MONTHS} months.",
                        "ev": json.dumps({
                            "first_crossing_month": ref,
                            "gap_pct": round(crossing_over[0][1], 4),
                        }),
                        "rp": ref,
                    })
                    inserted += 1

            if inserted % 500 == 0 and inserted > 0:
                db.commit()

        db.commit()
        total = db.execute(text("SELECT COUNT(*) FROM alerts")).scalar()
        print(f"  [alerts] Written {inserted} new alerts. Total in DB: {total}")
        return inserted

    finally:
        if close_after:
            db.close()
