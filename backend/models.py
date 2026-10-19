"""
models.py — SQLAlchemy ORM models for AI-LMIS.

All tables keep raw/imported data separate from derived/analytical results.
Every record tracks data provenance (synthetic vs. official).
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship
from database import Base


# ─── Geography ───────────────────────────────────────────────────────────────

class State(Base):
    __tablename__ = "states"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(10), unique=True, nullable=False)
    districts = relationship("District", back_populates="state")


class District(Base):
    __tablename__ = "districts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False, index=True)
    is_aspirational = Column(Boolean, default=False)
    state = relationship("State", back_populates="districts")

    __table_args__ = (
        Index("ix_districts_state_name", "state_id", "name"),
    )


# ─── Classification ───────────────────────────────────────────────────────────

class Sector(Base):
    __tablename__ = "sectors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)


class Occupation(Base):
    __tablename__ = "occupations"
    id = Column(Integer, primary_key=True, index=True)
    nco_code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    family = Column(String(200))
    sector_id = Column(Integer, ForeignKey("sectors.id"), index=True)
    nsqf_level = Column(Integer)
    source = Column(String(50), default="manual")        # manual | nco_pdf | import
    is_uncertain = Column(Boolean, default=False)         # flagged during PDF extraction
    created_at = Column(DateTime, default=datetime.utcnow)
    sector = relationship("Sector")


# ─── Training ─────────────────────────────────────────────────────────────────

class TrainingCentre(Base):
    __tablename__ = "training_centres"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), index=True)
    sector_id = Column(Integer, ForeignKey("sectors.id"), index=True)
    sanctioned_seats = Column(Integer, default=0)
    active = Column(Boolean, default=True)
    data_source = Column(String(100), default="synthetic")
    district = relationship("District")
    sector = relationship("Sector")


class TrainingCapacity(Base):
    __tablename__ = "training_capacity"
    id = Column(Integer, primary_key=True, index=True)
    centre_id = Column(Integer, ForeignKey("training_centres.id"), index=True)
    occupation_id = Column(Integer, ForeignKey("occupations.id"), index=True)
    month = Column(String(7), nullable=False, index=True)   # "YYYY-MM"
    sanctioned_seats = Column(Integer, default=0)
    enrolled = Column(Integer, default=0)
    certified = Column(Integer, default=0)
    placed = Column(Integer, default=0)
    data_source = Column(String(100), default="synthetic")
    provenance_type = Column(String(20), default="synthetic")  # synthetic|official|stub
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_tc_centre_occ_month", "centre_id", "occupation_id", "month"),
    )


# ─── Demand Signals ───────────────────────────────────────────────────────────

class DemandSignal(Base):
    __tablename__ = "demand_signals"
    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), index=True)
    occupation_id = Column(Integer, ForeignKey("occupations.id"), index=True)
    source_name = Column(String(50), nullable=False, index=True)   # job_portal|ncs|industry_hiring|eshram|plfs
    month = Column(String(7), nullable=False, index=True)
    raw_value = Column(Float)
    normalized_value = Column(Float)
    is_synthetic = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_ds_district_occ_source_month", "district_id", "occupation_id", "source_name", "month"),
    )


class DemandIndex(Base):
    __tablename__ = "demand_index"
    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), index=True)
    occupation_id = Column(Integer, ForeignKey("occupations.id"), index=True)
    month = Column(String(7), nullable=False, index=True)
    index_value = Column(Float)
    contributing_sources = Column(Text)   # JSON string
    weights_used = Column(Text)           # JSON string
    is_synthetic = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_di_district_occ_month", "district_id", "occupation_id", "month"),
    )


# ─── Forecasts ────────────────────────────────────────────────────────────────

class ForecastRun(Base):
    __tablename__ = "forecast_runs"
    id = Column(Integer, primary_key=True, index=True)
    run_date = Column(DateTime, default=datetime.utcnow)
    model_used = Column(String(100))
    horizon_months = Column(Integer, default=12)
    evaluation_mae = Column(Float)
    evaluation_rmse = Column(Float)
    baseline_mae = Column(Float)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class Forecast(Base):
    __tablename__ = "forecasts"
    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), index=True)
    occupation_id = Column(Integer, ForeignKey("occupations.id"), index=True)
    forecast_type = Column(String(20), nullable=False)   # demand | supply
    target_month = Column(String(7), nullable=False, index=True)
    point_forecast = Column(Float)
    lower_80 = Column(Float)   # NULL if unavailable
    upper_80 = Column(Float)   # NULL if unavailable
    model_name = Column(String(100))
    model_params = Column(Text)   # JSON
    run_id = Column(Integer, ForeignKey("forecast_runs.id"), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_fc_district_occ_type_month", "district_id", "occupation_id", "forecast_type", "target_month"),
    )


# ─── Gap Analysis ─────────────────────────────────────────────────────────────

class GapScore(Base):
    __tablename__ = "gap_scores"
    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), index=True)
    occupation_id = Column(Integer, ForeignKey("occupations.id"), index=True)
    month = Column(String(7), nullable=False, index=True)
    forecast_demand = Column(Float)
    forecast_supply = Column(Float)
    gap_pct = Column(Float)
    gap_band = Column(String(30))   # Critical Shortage|Shortage|Balanced|Oversupply|Critical Oversupply
    severity_score = Column(Float)
    is_synthetic = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_gs_district_occ_month", "district_id", "occupation_id", "month"),
    )


# ─── Alerts ───────────────────────────────────────────────────────────────────

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), index=True)
    occupation_id = Column(Integer, ForeignKey("occupations.id"), index=True)
    alert_type = Column(String(50))
    severity = Column(String(20))    # low|medium|high|critical
    rule_name = Column(String(100))
    rule_description = Column(Text)
    evidence = Column(Text)          # JSON
    reference_period = Column(String(20))
    acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_alerts_district_occ", "district_id", "occupation_id"),
    )


# ─── Recommendations ──────────────────────────────────────────────────────────

class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(Integer, ForeignKey("districts.id"), index=True)
    occupation_id = Column(Integer, ForeignKey("occupations.id"), index=True)
    action_type = Column(String(50))    # increase_seats|reduce_seats|reallocate|new_course|curriculum_review
    description = Column(Text)
    estimated_seat_change = Column(Integer, default=0)
    evidence = Column(Text)             # JSON
    assumptions = Column(Text)
    confidence_note = Column(Text)
    data_provenance = Column(String(20), default="synthetic")
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_rec_district_occ", "district_id", "occupation_id"),
    )


# ─── Data Provenance ──────────────────────────────────────────────────────────

class DataSource(Base):
    __tablename__ = "data_sources"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    adapter_name = Column(String(100))
    status = Column(String(20), default="mock")   # mock|active|unavailable|stub
    last_import = Column(DateTime)
    granularity = Column(String(100))
    provenance_type = Column(String(20), default="synthetic")
    notes = Column(Text)


class DataImport(Base):
    __tablename__ = "data_imports"
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("data_sources.id"), index=True)
    import_time = Column(DateTime, default=datetime.utcnow)
    record_count = Column(Integer, default=0)
    reference_period = Column(String(50))
    unit = Column(String(100))
    import_summary = Column(Text)
    errors = Column(Text)


# ─── API Cache (generic key-value payload store with TTL) ─────────────────────

class ApiCache(Base):
    """
    Generic cache for external API responses.
    Each row stores one JSON payload keyed by cache_key.
    Connector code uses INSERT OR REPLACE to overwrite stale entries.
    """
    __tablename__ = "api_cache"
    cache_key = Column(String(200), primary_key=True)
    payload_json = Column(Text, nullable=False)
    fetched_at = Column(String(50), nullable=False)   # ISO datetime string
    ttl_hours = Column(Float, default=24.0)


# ─── e-Shram snapshots ────────────────────────────────────────────────────────

class EshramSnapshot(Base):
    """
    One row per (snapshot_date, state, district).
    Keeps up to 30 daily snapshots; the pipeline prunes older ones.
    breakdown_json stores the raw demographic fields from data.gov.in.
    """
    __tablename__ = "eshram_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    snapshot_date = Column(String(20), nullable=False, index=True)
    state = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=False, index=True)
    total_workers = Column(Integer, default=0)
    breakdown_json = Column(Text)       # JSON with male/female/age/caste breakdown
    fetched_at = Column(String(50))     # ISO datetime string

    __table_args__ = (
        Index("ix_eshram_snapshot_date_state_district", "snapshot_date", "state", "district"),
    )
