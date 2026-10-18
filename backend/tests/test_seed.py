"""
test_seed.py — Tests for the synthetic data seed generator.
Run from backend/ directory: pytest tests/test_seed.py -v
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from sqlalchemy import text
from database import init_db, SessionLocal, engine
from models import Base


@pytest.fixture(scope="module")
def db_session():
    """Create a fresh in-memory test DB, seed it, return session."""
    from config import settings
    # Override DB to in-memory for tests
    import sqlalchemy
    test_engine = sqlalchemy.create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=test_engine)

    from sqlalchemy.orm import sessionmaker
    TestSession = sessionmaker(bind=test_engine)
    session = TestSession()

    # Monkey-patch SessionLocal and engine for seed
    import database
    orig_engine = database.engine
    orig_session = database.SessionLocal
    database.engine = test_engine
    database.SessionLocal = TestSession

    from seed.generate import run as seed_run
    seed_run()

    yield session

    database.engine = orig_engine
    database.SessionLocal = orig_session
    session.close()


def test_all_states_present(db_session):
    states = db_session.execute(text("SELECT name FROM states")).fetchall()
    names = [r[0] for r in states]
    assert "Uttar Pradesh" in names
    assert "Maharashtra" in names
    assert "Tamil Nadu" in names
    assert "Madhya Pradesh" in names


def test_state_count(db_session):
    count = db_session.execute(text("SELECT COUNT(*) FROM states")).scalar()
    assert count == 4


def test_district_count(db_session):
    count = db_session.execute(text("SELECT COUNT(*) FROM districts")).scalar()
    assert count == 24  # 4 states x 6 districts


def test_occupation_count(db_session):
    count = db_session.execute(text("SELECT COUNT(*) FROM occupations")).scalar()
    assert count == 60


def test_demand_signals_exist(db_session):
    count = db_session.execute(text("SELECT COUNT(*) FROM demand_signals")).scalar()
    assert count > 0


def test_demand_signals_are_synthetic(db_session):
    non_synthetic = db_session.execute(
        text("SELECT COUNT(*) FROM demand_signals WHERE is_synthetic=0")
    ).scalar()
    assert non_synthetic == 0, "All demand signals should be synthetic"


def test_idempotent_states(db_session):
    """Running seed again should not add duplicate states."""
    import database
    import sqlalchemy
    test_engine = sqlalchemy.create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=test_engine)
    from sqlalchemy.orm import sessionmaker
    TS = sessionmaker(bind=test_engine)

    orig_engine = database.engine
    orig_sl = database.SessionLocal
    database.engine = test_engine
    database.SessionLocal = TS

    from seed import generate
    generate.run()
    generate.run()  # second run

    s = TS()
    count = s.execute(text("SELECT COUNT(*) FROM states")).scalar()
    s.close()

    database.engine = orig_engine
    database.SessionLocal = orig_sl

    assert count == 4, f"Expected 4 states after double run, got {count}"


def test_training_capacity_exists(db_session):
    count = db_session.execute(text("SELECT COUNT(*) FROM training_capacity")).scalar()
    assert count > 0


def test_sectors_present(db_session):
    count = db_session.execute(text("SELECT COUNT(*) FROM sectors")).scalar()
    assert count == 10
