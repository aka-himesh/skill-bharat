"""
test_api.py — API endpoint tests using FastAPI TestClient.
Run from backend/ directory: pytest tests/test_api.py -v
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import sqlalchemy
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from fastapi.testclient import TestClient
from models import Base
import database as db_module


@pytest.fixture(scope="module")
def client():
    """Set up in-memory DB, seed, pipeline, return TestClient."""
    engine = sqlalchemy.create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TS = sessionmaker(bind=engine)

    orig_engine = db_module.engine
    orig_sl = db_module.SessionLocal
    db_module.engine = engine
    db_module.SessionLocal = TS

    # Seed
    from seed.generate import run as seed_run
    seed_run()

    # Minimal pipeline (demand_index + stub forecasts + gap + alerts + recs)
    session = TS()
    from pipeline import demand_index, gap_analysis, alerts, recommendations
    demand_index.run(session)

    months = session.execute(text(
        "SELECT DISTINCT month FROM demand_index ORDER BY month LIMIT 3"
    )).fetchall()
    combos = session.execute(text(
        "SELECT DISTINCT district_id, occupation_id FROM demand_index LIMIT 5"
    )).fetchall()
    session.execute(text("INSERT INTO forecast_runs (model_used, horizon_months) VALUES ('test', 3)"))
    session.commit()
    run_id = session.execute(text("SELECT MAX(id) FROM forecast_runs")).scalar()
    for did, oid in combos:
        for (m,) in months:
            for ft, val in [("demand", 0.6), ("supply", 0.3)]:
                session.execute(text("""
                    INSERT INTO forecasts (district_id, occupation_id, forecast_type,
                        target_month, point_forecast, model_name, run_id)
                    VALUES (:did,:oid,:ft,:m,:val,'test',:rid)
                """), {"did": did, "oid": oid, "ft": ft, "m": m, "val": val, "rid": run_id})
    session.commit()
    gap_analysis.run(session)
    alerts.run(session)
    recommendations.run(session)
    session.close()

    # Override get_db dependency to use test DB
    from main import app
    from database import get_db

    def override_get_db():
        s = TS()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.clear()
    db_module.engine = orig_engine
    db_module.SessionLocal = orig_sl


def _get_token(client):
    resp = client.post("/api/auth/login", json={"pin": "26246", "password": "zeroone"})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_config_public(client):
    """GET /api/config should work without authentication."""
    resp = client.get("/api/config")
    assert resp.status_code == 200
    data = resp.json()
    assert "app_name" in data
    assert "app_tagline" in data


def test_login_success(client):
    resp = client.post("/api/auth/login", json={"pin": "26246", "password": "zeroone"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_pin(client):
    resp = client.post("/api/auth/login", json={"pin": "00000", "password": "zeroone"})
    assert resp.status_code == 401


def test_login_wrong_password(client):
    resp = client.post("/api/auth/login", json={"pin": "26246", "password": "wrongpass"})
    assert resp.status_code == 401


def test_protected_without_token(client):
    resp = client.get("/api/geo/states")
    assert resp.status_code == 401


def test_geo_states(client):
    token = _get_token(client)
    resp = client.get("/api/geo/states", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 4
    names = [s["name"] for s in data]
    assert "Uttar Pradesh" in names


def test_geo_districts(client):
    token = _get_token(client)
    resp = client.get("/api/geo/districts", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert len(resp.json()) == 24


def test_summary(client):
    token = _get_token(client)
    resp = client.get("/api/summary", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["states"] == 4
    assert data["districts"] == 24
    assert data["occupations"] == 60


def test_gaps(client):
    token = _get_token(client)
    resp = client.get("/api/gaps", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "gaps" in data
    assert isinstance(data["gaps"], list)


def test_alerts(client):
    token = _get_token(client)
    resp = client.get("/api/alerts", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert "alerts" in resp.json()


def test_recommendations(client):
    token = _get_token(client)
    resp = client.get("/api/recommendations", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert "recommendations" in resp.json()


def test_occupations_search(client):
    token = _get_token(client)
    resp = client.get("/api/occupations?q=nurse", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


def test_gaps_csv_export(client):
    token = _get_token(client)
    resp = client.get("/api/gaps/export.csv", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    content = resp.text
    assert "state_name" in content  # header row present


def test_recommendations_csv_export(client):
    token = _get_token(client)
    resp = client.get("/api/recommendations/export.csv", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]


def test_sources_status(client):
    token = _get_token(client)
    resp = client.get("/api/sources/status", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 5


def test_methodology(client):
    token = _get_token(client)
    resp = client.get("/api/methodology", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert "pipeline_steps" in resp.json()
