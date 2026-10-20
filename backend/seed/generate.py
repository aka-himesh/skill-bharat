"""
generate.py — Reproducible synthetic data generator for AI-LMIS demo.

Run from backend/ directory:
    python -m seed.generate

Properties:
- Fixed random seed (42) — fully reproducible
- Idempotent — safe to run multiple times, no duplicate rows
- All records tagged is_synthetic=True
- Covers 4 states, 6 districts each, 10 sectors, 60 occupations
- 36 months of history with scenario-driven demand patterns
"""
import sys
import os
import json
import math
import random
import sqlite3
from datetime import datetime, date
from dateutil.relativedelta import relativedelta

# Allow running as `python -m seed.generate` from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
import database
from models import (
    State, District, Sector, Occupation,
    TrainingCentre, TrainingCapacity,
    DemandSignal, DataSource
)

RNG = random.Random(42)

# ─── Master Data ─────────────────────────────────────────────────────────────

STATES = [
    {"name": "Uttar Pradesh",  "code": "UP"},
    {"name": "Maharashtra",    "code": "MH"},
    {"name": "Tamil Nadu",     "code": "TN"},
    {"name": "Madhya Pradesh", "code": "MP"},
]

DISTRICTS = {
    "UP": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj", "Meerut"],
    "MH": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Thane"],
    "TN": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli"],
    "MP": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Rewa", "Sagar"],
}

# Districts marked aspirational for demonstration (not official classification)
ASPIRATIONAL = {"Rewa", "Sagar", "Varanasi", "Prayagraj", "Tirunelveli", "Salem"}

SECTORS = [
    {"name": "Information Technology", "code": "IT"},
    {"name": "Construction",           "code": "CONST"},
    {"name": "Healthcare",             "code": "HEALTH"},
    {"name": "Agriculture",            "code": "AGRI"},
    {"name": "Retail",                 "code": "RETAIL"},
    {"name": "Hospitality & Tourism",  "code": "HOSP"},
    {"name": "Manufacturing",          "code": "MFG"},
    {"name": "Automotive",             "code": "AUTO"},
    {"name": "Banking & Finance",      "code": "BFSI"},
    {"name": "Electronics",            "code": "ELEC"},
]

# (nco_code, name, sector_code, nsqf_level, scenario)
# scenario: oversupply | shortage | seasonal_agri | seasonal_hosp | normal
OCCUPATIONS = [
    # IT
    ("2513.0001", "Software Developer",          "IT",     6, "normal"),
    ("3514.0001", "Data Entry Operator",         "IT",     3, "oversupply"),
    ("2521.0001", "Network Administrator",       "IT",     5, "normal"),
    ("3513.0001", "IT Support Technician",       "IT",     4, "normal"),
    ("2512.0001", "Web Developer",               "IT",     5, "normal"),
    ("2511.0001", "Systems Analyst",             "IT",     6, "normal"),
    # Construction
    ("7112.0001", "Mason / Bricklayer",          "CONST",  3, "normal"),
    ("7119.0001", "Construction Worker (General)","CONST", 2, "normal"),
    ("3118.0001", "Civil Draughtsman",           "CONST",  4, "normal"),
    ("7126.0001", "Plumber",                     "CONST",  3, "normal"),
    ("3123.0001", "CCTV Installation Technician","CONST",  4, "shortage"),
    ("7121.0001", "Solar Panel Installer",       "CONST",  4, "shortage"),
    # Healthcare
    ("3221.0001", "General Nurse",               "HEALTH", 5, "shortage"),
    ("3212.0001", "Phlebotomy Technician",       "HEALTH", 4, "shortage"),
    ("3211.0001", "Medical Lab Technician",      "HEALTH", 5, "normal"),
    ("5321.0001", "Home Health Aide",            "HEALTH", 3, "normal"),
    ("3213.0001", "Pharmacy Assistant",          "HEALTH", 4, "normal"),
    ("3216.0001", "Dental Technician",           "HEALTH", 5, "normal"),
    # Agriculture
    ("6111.0001", "Agricultural Field Worker",   "AGRI",   2, "seasonal_agri"),
    ("6112.0001", "Dairy Farm Worker",           "AGRI",   2, "seasonal_agri"),
    ("6113.0001", "Horticulture Worker",         "AGRI",   3, "seasonal_agri"),
    ("3141.0001", "Agriculture Technician",      "AGRI",   4, "normal"),
    ("6114.0001", "Poultry Farm Worker",         "AGRI",   2, "normal"),
    # Retail
    ("5220.0001", "Retail Sales Associate",      "RETAIL", 3, "oversupply"),
    ("5221.0001", "Cashier",                     "RETAIL", 3, "oversupply"),
    ("1420.0001", "Retail Store Manager",        "RETAIL", 6, "normal"),
    ("5223.0001", "Visual Merchandiser",         "RETAIL", 4, "normal"),
    ("5222.0001", "E-commerce Executive",        "RETAIL", 4, "normal"),
    # Hospitality
    ("5120.0001", "Hotel Receptionist",          "HOSP",   4, "seasonal_hosp"),
    ("5131.0001", "Waiter / Food Service Worker","HOSP",   3, "seasonal_hosp"),
    ("5122.0001", "Housekeeping Attendant",      "HOSP",   2, "seasonal_hosp"),
    ("3434.0001", "Tour Guide",                  "HOSP",   4, "seasonal_hosp"),
    ("5121.0001", "Chef / Cook",                 "HOSP",   4, "normal"),
    ("5123.0001", "Barista",                     "HOSP",   3, "normal"),
    # Manufacturing
    ("7221.0001", "Welder",                      "MFG",    4, "normal"),
    ("7223.0001", "Metal Machinist",             "MFG",    4, "normal"),
    ("7513.0001", "Tailor / Sewing Operator",    "MFG",    3, "oversupply"),
    ("7512.0001", "Garment Checker",             "MFG",    3, "oversupply"),
    ("7222.0001", "Sheet Metal Worker",          "MFG",    3, "normal"),
    ("7231.0001", "Electrician",                 "MFG",    4, "normal"),
    # Automotive
    ("7231.0002", "Auto Service Technician",     "AUTO",   4, "shortage"),
    ("7232.0001", "Two-Wheeler Mechanic",        "AUTO",   3, "shortage"),
    ("7233.0001", "Diesel Engine Mechanic",      "AUTO",   4, "normal"),
    ("3115.0001", "Auto CAD Draughtsman",        "AUTO",   5, "normal"),
    ("7234.0001", "Vehicle Body Painter",        "AUTO",   3, "normal"),
    # Electronics
    ("7422.0001", "Smartphone Repair Technician","ELEC",   4, "shortage"),
    ("7421.0001", "Electronic Equipment Servicer","ELEC",  4, "shortage"),
    ("7423.0001", "PCB Assembler",               "ELEC",   3, "normal"),
    ("3114.0001", "Electronics Technician",      "ELEC",   4, "normal"),
    ("7424.0001", "Home Appliance Repair Tech",  "ELEC",   3, "normal"),
    # BFSI
    ("3311.0001", "Banking Correspondent",       "BFSI",   4, "normal"),
    ("3312.0001", "Insurance Agent",             "BFSI",   4, "normal"),
    ("3313.0001", "Microfinance Officer",        "BFSI",   5, "normal"),
    ("4211.0001", "Teller / Bank Clerk",         "BFSI",   5, "normal"),
    ("3315.0001", "Accountant",                  "BFSI",   6, "normal"),
    # Additional cross-sector
    ("4110.0001", "Office Administrator",        "IT",     4, "normal"),
    ("4132.0001", "Data Analyst",                "IT",     5, "normal"),
    ("3359.0001", "Health & Safety Officer",     "MFG",    5, "normal"),
    ("5414.0001", "Security Guard",              "CONST",  2, "normal"),
    ("9112.0001", "Domestic Worker",             "HOSP",   1, "normal"),
]

SOURCE_NAMES = ["job_portal", "ncs", "industry_hiring", "eshram", "plfs"]

# Source characteristics: (base_scale, noise_std, lag_months, missing_prob)
SOURCE_PROFILES = {
    "job_portal":      (1.0, 0.15, 0, 0.03),
    "ncs":             (0.7, 0.20, 1, 0.10),
    "industry_hiring": (0.8, 0.12, 2, 0.08),
    "eshram":          (0.5, 0.25, 0, 0.15),
    "plfs":            (0.3, 0.10, 3, 0.30),
}

# Scenario base demand levels (0–1 scale)
SCENARIO_BASE = {
    "shortage":      0.75,
    "oversupply":    0.25,
    "seasonal_agri": 0.50,
    "seasonal_hosp": 0.50,
    "normal":        0.50,
}


def get_months(n_months: int = 36) -> list[str]:
    """Return last n_months as 'YYYY-MM' strings, ending this month."""
    today = date.today()
    months = []
    for i in range(n_months - 1, -1, -1):
        d = today - relativedelta(months=i)
        months.append(d.strftime("%Y-%m"))
    return months


def demand_signal(scenario: str, month_idx: int, source: str,
                  district_code: str, occ_code: str) -> float | None:
    """Generate a synthetic demand signal for a given scenario/month/source."""
    scale, noise_std, lag, missing_prob = SOURCE_PROFILES[source]

    # Apply lag
    effective_idx = max(0, month_idx - lag)
    base = SCENARIO_BASE[scenario]

    # Trend component
    if scenario == "shortage":
        trend = 0.005 * effective_idx           # slow upward trend
    elif scenario == "oversupply":
        trend = -0.003 * effective_idx          # mild downward
    else:
        trend = 0.0

    # Seasonal component
    month_num = (effective_idx % 12) + 1
    if scenario == "seasonal_agri":
        # Peak Jun-Sep (monsoon / kharif)
        seasonal = 0.25 * math.sin(2 * math.pi * (month_num - 7) / 12)
    elif scenario == "seasonal_hosp":
        # Peak Nov-Feb (winter tourism)
        seasonal = 0.20 * math.sin(2 * math.pi * (month_num - 12) / 12)
    else:
        seasonal = 0.0

    # District contrast factor (same occupation, different districts)
    district_factor = RNG.gauss(1.0, 0.15)

    raw = (base + trend + seasonal) * scale * district_factor
    raw = max(0.0, min(1.0, raw))

    # Noise
    raw += RNG.gauss(0, noise_std)
    raw = max(0.0, min(1.0, raw))

    # Missing data
    if RNG.random() < missing_prob:
        return None

    return round(raw, 4)


def upsert_or_get(session, model_class, filters: dict, defaults: dict = None):
    """Get existing record or create new one. Returns (instance, created)."""
    obj = session.query(model_class).filter_by(**filters).first()
    if obj:
        return obj, False
    data = {**filters, **(defaults or {})}
    obj = model_class(**data)
    session.add(obj)
    session.flush()
    return obj, True


def run():
    print("=" * 60)
    print("AI-LMIS Synthetic Data Seed Generator")
    print("Random seed: 42 | Idempotent | All data is SYNTHETIC")
    print("=" * 60)

    database.init_db()
    session = database.SessionLocal()

    try:
        counts = {
            "states": 0, "districts": 0, "sectors": 0, "occupations": 0,
            "training_centres": 0, "training_capacity": 0, "demand_signals": 0,
            "data_sources": 0,
        }

        # ── States ──────────────────────────────────────────────────────────
        print("\n[1/7] Seeding states and districts...")
        state_map = {}
        for s in STATES:
            obj, created = upsert_or_get(session, State, {"code": s["code"]}, {"name": s["name"]})
            state_map[s["code"]] = obj
            if created:
                counts["states"] += 1

        district_map = {}  # (state_code, district_name) -> District
        for state_code, district_names in DISTRICTS.items():
            state_obj = state_map[state_code]
            for dname in district_names:
                obj, created = upsert_or_get(
                    session, District,
                    {"name": dname, "state_id": state_obj.id},
                    {"is_aspirational": dname in ASPIRATIONAL}
                )
                district_map[(state_code, dname)] = obj
                if created:
                    counts["districts"] += 1

        session.commit()
        print(f"  States: {len(state_map)} | Districts: {sum(len(v) for v in DISTRICTS.values())}")

        # ── Sectors ─────────────────────────────────────────────────────────
        print("\n[2/7] Seeding sectors...")
        sector_map = {}
        for sec in SECTORS:
            obj, created = upsert_or_get(session, Sector, {"code": sec["code"]}, {"name": sec["name"]})
            sector_map[sec["code"]] = obj
            if created:
                counts["sectors"] += 1
        session.commit()
        print(f"  Sectors: {len(sector_map)}")

        # ── Occupations ─────────────────────────────────────────────────────
        print("\n[3/7] Seeding occupations...")
        occ_map = {}  # nco_code -> Occupation
        for nco_code, name, sec_code, nsqf, scenario in OCCUPATIONS:
            sector_obj = sector_map[sec_code]
            obj, created = upsert_or_get(
                session, Occupation,
                {"nco_code": nco_code},
                {
                    "name": name,
                    "sector_id": sector_obj.id,
                    "nsqf_level": nsqf,
                    "source": "manual",
                    "is_uncertain": False,
                    "family": sec_code,
                }
            )
            occ_map[nco_code] = (obj, scenario)
            if created:
                counts["occupations"] += 1
        session.commit()
        print(f"  Occupations: {len(occ_map)}")

        # ── Training Centres ─────────────────────────────────────────────────
        print("\n[4/7] Seeding training centres...")
        centre_map = {}  # (district_id, sector_id) -> TrainingCentre
        for state_code, district_names in DISTRICTS.items():
            for dname in district_names:
                district_obj = district_map[(state_code, dname)]
                # 2 centres per district from 3 random sectors
                chosen_sectors = RNG.sample(list(sector_map.values()), 3)
                for i, sec_obj in enumerate(chosen_sectors):
                    centre_name = f"{dname} Skill Centre {i+1}"
                    obj, created = upsert_or_get(
                        session, TrainingCentre,
                        {"name": centre_name, "district_id": district_obj.id},
                        {
                            "sector_id": sec_obj.id,
                            "sanctioned_seats": RNG.randint(50, 300),
                            "active": True,
                            "data_source": "synthetic",
                        }
                    )
                    key = (district_obj.id, sec_obj.id, i)
                    centre_map[key] = obj
                    if created:
                        counts["training_centres"] += 1
        session.commit()
        print(f"  Training centres: {counts['training_centres']}")

        # ── Training Capacity ─────────────────────────────────────────────
        print("\n[5/7] Seeding training capacity (36 months)...")
        months = get_months(36)

        # Use raw sqlite for bulk insert speed
        from sqlalchemy import text

        # Check existing count
        existing_tc = session.execute(text("SELECT COUNT(*) FROM training_capacity")).scalar()
        if existing_tc > 0:
            print(f"  Training capacity already seeded ({existing_tc} rows). Skipping.")
        else:
            tc_rows = []
            for centre_key, centre_obj in centre_map.items():
                # Pick 3 random occupations for each centre
                occ_sample = RNG.sample(list(occ_map.values()), min(3, len(occ_map)))
                for occ_obj, scenario in occ_sample:
                    seats = RNG.randint(20, 150)
                    for month in months:
                        enroll_rate = RNG.uniform(0.60, 0.95)
                        cert_rate   = RNG.uniform(0.50, 0.88)
                        place_rate  = RNG.uniform(0.40, 0.80)
                        # Scenario-based seat adjustment
                        if scenario == "oversupply":
                            seats_m = int(seats * RNG.uniform(1.2, 1.6))
                        elif scenario == "shortage":
                            seats_m = int(seats * RNG.uniform(0.5, 0.8))
                        else:
                            seats_m = seats
                        enrolled  = int(seats_m * enroll_rate)
                        certified = int(enrolled * cert_rate)
                        placed    = int(certified * place_rate)
                        tc_rows.append({
                            "centre_id": centre_obj.id,
                            "occupation_id": occ_obj.id,
                            "month": month,
                            "sanctioned_seats": seats_m,
                            "enrolled": enrolled,
                            "certified": certified,
                            "placed": placed,
                            "data_source": "synthetic",
                            "provenance_type": "synthetic",
                        })

            session.execute(
                text("""INSERT INTO training_capacity
                    (centre_id, occupation_id, month, sanctioned_seats, enrolled, certified, placed, data_source, provenance_type)
                    VALUES (:centre_id, :occupation_id, :month, :sanctioned_seats, :enrolled, :certified, :placed, :data_source, :provenance_type)
                """),
                tc_rows
            )
            session.commit()
            counts["training_capacity"] = len(tc_rows)
            print(f"  Training capacity rows: {len(tc_rows)}")

        # ── Demand Signals ────────────────────────────────────────────────
        print("\n[6/7] Seeding demand signals (36 months × 5 sources)...")
        existing_ds = session.execute(text("SELECT COUNT(*) FROM demand_signals")).scalar()
        if existing_ds > 0:
            print(f"  Demand signals already seeded ({existing_ds} rows). Skipping.")
        else:
            ds_rows = []
            for state_code, district_names in DISTRICTS.items():
                for dname in district_names:
                    district_obj = district_map[(state_code, dname)]
                    for nco_code, (occ_obj, scenario) in occ_map.items():
                        for m_idx, month in enumerate(months):
                            for src in SOURCE_NAMES:
                                val = demand_signal(scenario, m_idx, src, state_code, nco_code)
                                ds_rows.append({
                                    "district_id": district_obj.id,
                                    "occupation_id": occ_obj.id,
                                    "source_name": src,
                                    "month": month,
                                    "raw_value": val,
                                    "normalized_value": None,  # set by pipeline
                                    "is_synthetic": 1,
                                    "provenance": "synthetic_demo",
                                })

            # Batch insert in chunks
            chunk = 5000
            for i in range(0, len(ds_rows), chunk):
                session.execute(
                    text("""INSERT INTO demand_signals
                        (district_id, occupation_id, source_name, month, raw_value, normalized_value, is_synthetic, provenance)
                        VALUES (:district_id, :occupation_id, :source_name, :month, :raw_value, :normalized_value, :is_synthetic, :provenance)
                    """),
                    ds_rows[i:i+chunk]
                )
            session.commit()
            counts["demand_signals"] = len(ds_rows)
            print(f"  Demand signal rows: {len(ds_rows)}")

        # ── Data Sources ──────────────────────────────────────────────────
        print("\n[7/7] Seeding data source registry...")
        ds_registry = [
            {"name": "Job Portal Aggregated Signals", "adapter_name": "job_portal_connector",
             "status": "mock", "provenance_type": "synthetic",
             "granularity": "Monthly / District / Occupation",
             "notes": "Synthetic job posting signals. Real: data-sharing agreement required."},
            {"name": "NCS Job Demand", "adapter_name": "ncs_connector",
             "status": "stub", "provenance_type": "synthetic",
             "granularity": "Monthly / District / Occupation",
             "notes": "Requires NCS API authorization from NIC/Ministry of Labour."},
            {"name": "Industry Hiring Signals", "adapter_name": "training_connector",
             "status": "mock", "provenance_type": "synthetic",
             "granularity": "Monthly / District / Sector",
             "notes": "Simulated employer hiring intent data."},
            {"name": "e-Shram Worker Registrations", "adapter_name": "eshram_connector",
             "status": "mock", "provenance_type": "synthetic",
             "granularity": "Cumulative / District / Sector",
             "notes": "Contextual indicator only. Requires MoLE data-sharing agreement."},
            {"name": "PLFS / MoSPI Labour Force Indicators", "adapter_name": "plfs_connector",
             "status": "mock", "provenance_type": "synthetic",
             "granularity": "State / Annual",
             "notes": "LFPR/WPR/UR contextual indicators. Requires MoSPI e-Sankhyiki access."},
        ]
        for ds in ds_registry:
            obj, created = upsert_or_get(session, DataSource, {"name": ds["name"]}, ds)
            if created:
                counts["data_sources"] += 1
        session.commit()

        # ── Summary ──────────────────────────────────────────────────────
        print("\n" + "=" * 60)
        print("SEED COMPLETE — Summary")
        print("=" * 60)
        for k, v in counts.items():
            print(f"  {k:<25}: {v} new rows")
        # Totals from DB
        for tbl in ["states", "districts", "sectors", "occupations",
                    "training_centres", "training_capacity", "demand_signals"]:
            total = session.execute(text(f"SELECT COUNT(*) FROM {tbl}")).scalar()
            print(f"  {tbl:<25}: {total} total in DB")
        print("\nAll data labelled synthetic. Safe to run again (idempotent).")

    except Exception as e:
        session.rollback()
        print(f"\nERROR during seed: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run()
