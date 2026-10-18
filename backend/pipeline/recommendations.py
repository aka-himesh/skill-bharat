"""
recommendations.py — Rule-based recommendation engine for AI-LMIS pipeline.

Deterministic rules — no LLM. Recommendations include evidence, assumptions,
and explicit confidence/limitation notes.
See docs/METHODOLOGY.md §8.
"""
import json
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import SessionLocal

CONFIDENCE_NOTE = (
    "Based on synthetic demonstration data. "
    "This is a planning suggestion only, not an approved policy decision. "
    "Projected demand does not guarantee employment. "
    "Validate with official data before implementation."
)


def _exists(db, district_id, occupation_id, action_type):
    r = db.execute(text("""
        SELECT id FROM recommendations
        WHERE district_id=:did AND occupation_id=:oid AND action_type=:at
    """), {"did": district_id, "oid": occupation_id, "at": action_type}).fetchone()
    return r is not None


def run(db=None):
    close_after = db is None
    if db is None:
        db = SessionLocal()

    print("  [recommendations] Generating recommendations...")

    try:
        # Clear old recommendations (re-run safe)
        db.execute(text("DELETE FROM recommendations"))
        db.commit()

        # Get latest gap per district/occupation
        gap_rows = db.execute(text("""
            SELECT gs.district_id, gs.occupation_id, gs.month,
                   gs.gap_pct, gs.gap_band, gs.severity_score,
                   gs.forecast_demand, gs.forecast_supply
            FROM gap_scores gs
            INNER JOIN (
                SELECT district_id, occupation_id, MAX(month) as max_month
                FROM gap_scores GROUP BY district_id, occupation_id
            ) latest ON gs.district_id=latest.district_id
                     AND gs.occupation_id=latest.occupation_id
                     AND gs.month=latest.max_month
        """)).fetchall()

        # Get current training capacity per district/occupation
        capacity_map = {}
        cap_rows = db.execute(text("""
            SELECT ctr.district_id, tc.occupation_id, SUM(tc.sanctioned_seats) as total_seats
            FROM training_capacity tc
            JOIN training_centres ctr ON tc.centre_id = ctr.id
            GROUP BY ctr.district_id, tc.occupation_id
        """)).fetchall()
        for did, oid, seats in cap_rows:
            capacity_map[(did, oid)] = seats or 0

        inserted = 0

        for row in gap_rows:
            district_id, occupation_id, month, gap_pct, gap_band, severity, fd, fs = row
            current_seats = capacity_map.get((district_id, occupation_id), 50)

            recs_to_insert = []

            # ── Critical Shortage → Increase seats ──────────────────────────
            if gap_band in ("Critical Shortage", "Shortage"):
                increase_pct = 0.30 if gap_band == "Critical Shortage" else 0.20
                seat_change = max(10, int(current_seats * increase_pct))
                recs_to_insert.append({
                    "action_type": "increase_seats",
                    "description": (
                        f"Increase training capacity by ~{int(increase_pct*100)}% "
                        f"({seat_change} seats) to address {gap_band.lower()} "
                        f"(gap={gap_pct:.1%})."
                    ),
                    "estimated_seat_change": seat_change,
                    "evidence": json.dumps({
                        "gap_band": gap_band, "gap_pct": round(gap_pct, 4),
                        "severity_score": round(severity, 2),
                        "forecast_demand": round(fd, 4), "forecast_supply": round(fs, 4),
                        "current_seats": current_seats, "reference_month": month,
                    }),
                    "assumptions": (
                        "Assumes current enrolment-to-seat ratio maintained. "
                        "Training duration 3-6 months. "
                        "Seat increase feasible within existing centre infrastructure."
                    ),
                })

            # ── Oversupply → Reduce seats or reallocate ──────────────────────
            elif gap_band in ("Oversupply", "Critical Oversupply"):
                reduce_pct = 0.25 if gap_band == "Critical Oversupply" else 0.15
                seat_change = -max(5, int(current_seats * reduce_pct))
                recs_to_insert.append({
                    "action_type": "reduce_seats",
                    "description": (
                        f"Reduce training seats by ~{int(reduce_pct*100)}% "
                        f"({abs(seat_change)} seats) to address {gap_band.lower()} "
                        f"(gap={gap_pct:.1%})."
                    ),
                    "estimated_seat_change": seat_change,
                    "evidence": json.dumps({
                        "gap_band": gap_band, "gap_pct": round(gap_pct, 4),
                        "severity_score": round(severity, 2),
                        "current_seats": current_seats, "reference_month": month,
                    }),
                    "assumptions": (
                        "Reduction applied only to new intake; existing batches unaffected. "
                        "Freed capacity should be evaluated for reallocation to shortage occupations."
                    ),
                })
                # Also suggest reallocation
                recs_to_insert.append({
                    "action_type": "reallocate",
                    "description": (
                        f"Consider reallocating {abs(seat_change)} freed seats to "
                        "shortage occupations in the same district."
                    ),
                    "estimated_seat_change": 0,
                    "evidence": json.dumps({
                        "gap_band": gap_band, "source_occupation_id": occupation_id,
                        "current_seats": current_seats,
                    }),
                    "assumptions": (
                        "Assumes training centres have multi-occupation flexibility. "
                        "Trainer redeployment or new trainer hiring may be required."
                    ),
                })

            # ── High severity + shortage → suggest new course ───────────────
            if gap_band == "Critical Shortage" and severity > 60:
                recs_to_insert.append({
                    "action_type": "new_course",
                    "description": (
                        "High severity critical shortage detected. "
                        "Consider introducing a new training course or batch "
                        "if no centre currently offers this occupation."
                    ),
                    "estimated_seat_change": 30,
                    "evidence": json.dumps({
                        "gap_band": gap_band, "severity_score": round(severity, 2),
                        "reference_month": month,
                    }),
                    "assumptions": (
                        "Assumes trainer availability and NSQF alignment. "
                        "New course introduction requires regulatory approval."
                    ),
                })

            # ── Curriculum review flag for seasonal patterns ─────────────────
            # Check if occupation has seasonal pattern in alerts
            seasonal_alert = db.execute(text("""
                SELECT id FROM alerts
                WHERE district_id=:did AND occupation_id=:oid
                  AND alert_type='demand_trend'
            """), {"did": district_id, "oid": occupation_id}).fetchone()
            if seasonal_alert and gap_band != "Balanced":
                recs_to_insert.append({
                    "action_type": "curriculum_review",
                    "description": (
                        "Demand trend detected alongside supply gap. "
                        "Review course timing/intake schedule to align with seasonal demand peaks."
                    ),
                    "estimated_seat_change": 0,
                    "evidence": json.dumps({
                        "has_demand_trend_alert": True,
                        "gap_band": gap_band,
                    }),
                    "assumptions": "Seasonal pattern inferred from demand index trend alerts.",
                })

            for rec in recs_to_insert:
                db.execute(text("""
                    INSERT INTO recommendations
                        (district_id, occupation_id, action_type, description,
                         estimated_seat_change, evidence, assumptions,
                         confidence_note, data_provenance)
                    VALUES (:did, :oid, :at, :desc, :sc, :ev, :assum, :cn, :dp)
                """), {
                    "did": district_id, "oid": occupation_id,
                    "at": rec["action_type"],
                    "desc": rec["description"],
                    "sc": rec["estimated_seat_change"],
                    "ev": rec["evidence"],
                    "assum": rec["assumptions"],
                    "cn": CONFIDENCE_NOTE,
                    "dp": "synthetic",
                })
                inserted += 1

        db.commit()
        print(f"  [recommendations] Written {inserted} recommendations.")
        return inserted

    finally:
        if close_after:
            db.close()
