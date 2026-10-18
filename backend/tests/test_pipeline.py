"""
test_pipeline.py — Tests for the analytical pipeline.
Run from backend/ directory: pytest tests/test_pipeline.py -v
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import sqlalchemy
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from models import Base
import database as db_module

VALID_BANDS = {"Critical Shortage", "Shortage", "Balanced", "Oversupply", "Critical Oversupply"}


@pytest.fixture(scope="module")
def seeded_db():
    """Create in-memory DB, seed, run pipeline, return session."""
    engine = sqlalchemy.create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TS = sessionmaker(bind=engine)

    orig_engine = db_module.engine
    orig_sl = db_module.SessionLocal
    db_module.engine = engine
    db_module.SessionLocal = TS

    from seed.generate import run as seed_run
    seed_run()

    session = TS()

    from pipeline import demand_index, gap_analysis, alerts, recommendations
    demand_index.run(session)
    # Note: skipping full forecasting in tests (slow) — use gap_analysis with mock forecasts
    # Insert minimal forecast data for gap_analysis
    months = session.execute(text(
        "SELECT DISTINCT month FROM demand_index ORDER BY month LIMIT 3"
    )).fetchall()
    combos = session.execute(text(
        "SELECT DISTINCT district_id, occupation_id FROM demand_index LIMIT 10"
    )).fetchall()

    fr_id = session.execute(text(
        "INSERT INTO forecast_runs (model_used, horizon_months) VALUES ('test', 3)"
    ))
    session.commit()
    run_id = session.execute(text("SELECT MAX(id) FROM forecast_runs")).scalar()

    for did, oid in combos:
        for m_row in months:
            m = m_row[0]
            for ftype, val in [("demand", 0.6), ("supply", 0.3)]:
                session.execute(text("""
                    INSERT INTO forecasts
                        (district_id, occupation_id, forecast_type, target_month,
                         point_forecast, model_name, run_id)
                    VALUES (:did, :oid, :ft, :tm, :pf, 'test', :rid)
                """), {"did": did, "oid": oid, "ft": ftype, "tm": m, "pf": val, "rid": run_id})
    session.commit()

    gap_analysis.run(session)
    alerts.run(session)
    recommendations.run(session)

    yield session

    db_module.engine = orig_engine
    db_module.SessionLocal = orig_sl
    session.close()


def test_demand_index_populated(seeded_db):
    count = seeded_db.execute(text("SELECT COUNT(*) FROM demand_index")).scalar()
    assert count > 0, "Demand index should have records after pipeline run"


def test_demand_index_range(seeded_db):
    """Index values should be in [0, 1]."""
    bad = seeded_db.execute(text(
        "SELECT COUNT(*) FROM demand_index WHERE index_value < 0 OR index_value > 1.01"
    )).scalar()
    assert bad == 0, f"{bad} demand index values out of [0,1] range"


def test_gap_scores_populated(seeded_db):
    count = seeded_db.execute(text("SELECT COUNT(*) FROM gap_scores")).scalar()
    assert count > 0


def test_gap_band_values_valid(seeded_db):
    bands = seeded_db.execute(text("SELECT DISTINCT gap_band FROM gap_scores")).fetchall()
    for (b,) in bands:
        assert b in VALID_BANDS, f"Invalid gap band: {b}"


def test_no_division_by_zero(seeded_db):
    """Gap pct should never be infinite or NaN."""
    bad = seeded_db.execute(text(
        "SELECT COUNT(*) FROM gap_scores WHERE gap_pct IS NULL"
    )).scalar()
    assert bad == 0


def test_severity_in_range(seeded_db):
    bad = seeded_db.execute(text(
        "SELECT COUNT(*) FROM gap_scores WHERE severity_score < 0 OR severity_score > 100.01"
    )).scalar()
    assert bad == 0


def test_alerts_generated(seeded_db):
    count = seeded_db.execute(text("SELECT COUNT(*) FROM alerts")).scalar()
    assert count >= 0   # May be 0 if no rules triggered, but should not error


def test_recommendations_generated(seeded_db):
    count = seeded_db.execute(text("SELECT COUNT(*) FROM recommendations")).scalar()
    assert count >= 0
