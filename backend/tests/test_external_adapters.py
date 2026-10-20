import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
import sqlalchemy
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models import Base
from adapters import external
from adapters.mospi_adapter import map_plfs_rows
from adapters.ncs_adapter import NCSAdapter, load_calibrated_fallback
from config import settings


@pytest.fixture
def cache_db(monkeypatch):
    engine = sqlalchemy.create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    monkeypatch.setattr(external, "SessionLocal", sessionmaker(bind=engine))
    external.reset_breaker()
    yield
    external.reset_breaker()
    engine.dispose()


def test_ncs_missing_credentials_is_not_configured(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "NCS_API_BASE_URL", "")
    monkeypatch.setattr(settings, "NCS_API_KEY", "")
    empty_file = tmp_path / "calibration.json"
    empty_file.write_text('{"source":"","source_date":"","state_vacancy_shares":{},"sector_vacancy_shares":{}}')
    result = NCSAdapter().fetch_data()
    assert result["availability"] == "NOT_CONFIGURED"
    assert result["provenance"]["source"] == "synthetic_demo"
    assert result["data"] == []
    assert load_calibrated_fallback(empty_file) == ([], "synthetic_demo")


def test_external_cache_hit_and_stale_fallback(cache_db, monkeypatch):
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    monkeypatch.setattr(external, "utc_now", lambda: now)
    monkeypatch.setattr(settings, "EXTERNAL_CACHE_TTL_HOURS", 24)
    calls = []

    class Response:
        status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return {"data": [1]}

    def success(*args, **kwargs):
        calls.append(1)
        return Response()

    monkeypatch.setattr(external.httpx, "get", success)
    first = external.fetch_json("live_mospi", "https://example.invalid/data")
    hit = external.fetch_json("live_mospi", "https://example.invalid/data")
    assert first["provenance"]["status"] == "LIVE"
    assert hit["provenance"]["status"] == "CACHED"
    assert len(calls) == 1

    monkeypatch.setattr(external, "utc_now", lambda: now + timedelta(days=2))
    monkeypatch.setattr(external.httpx, "get", lambda *args, **kwargs: (_ for _ in ()).throw(TimeoutError()))
    monkeypatch.setattr(settings, "EXTERNAL_MAX_RETRIES", 0)
    stale = external.fetch_json("live_mospi", "https://example.invalid/data", force_refresh=True)
    assert stale["data"] == {"data": [1]}
    assert stale["provenance"]["status"] == "STALE"
    assert stale["provenance"]["stale"] is True


def test_mospi_fixture_maps_real_values_with_provenance():
    fixture_path = Path(__file__).parent / "fixtures" / "mospi_plfs_sample.json"
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    rows = map_plfs_rows(fixture["response"]["data"], frequency_code=1, indicator_code=3)
    assert rows
    assert rows[0]["signal_type"] == "plfs_employment_trend"
    assert rows[0]["value"] == 1.9
    assert rows[0]["state"] == "All India"
    assert rows[0]["provenance"] == "live_mospi"
    assert rows[0]["is_synthetic"] is False


def test_source_status_never_serializes_credentials(cache_db, monkeypatch, caplog):
    from adapters.source_registry import get_source_statuses

    secret = "do-not-expose-this-key"
    monkeypatch.setattr(settings, "MOSPI_API_KEY", secret)
    monkeypatch.setattr(settings, "NCS_API_KEY", "")
    monkeypatch.setattr(settings, "NCS_API_BASE_URL", "")
    monkeypatch.setattr(settings, "DATA_GOV_IN_API_KEY", "")
    serialized = json.dumps(get_source_statuses())
    assert secret not in serialized
    assert secret not in caplog.text

    monkeypatch.setattr(settings, "EXTERNAL_MAX_RETRIES", 0)
    monkeypatch.setattr(
        external.httpx, "get",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError(f"request included {secret}")),
    )
    failure = external.fetch_json("live_mospi", "https://example.invalid/failure", force_refresh=True)
    assert secret not in json.dumps(failure)
    assert secret not in caplog.text

