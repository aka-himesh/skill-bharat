"""
database.py — SQLAlchemy engine, session and table initialisation for AI-LMIS.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import settings


engine = create_engine(
    settings.DB_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: yields a DB session and closes it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables if they do not already exist."""
    import models  # noqa: F401 — ensure all models are registered
    Base.metadata.create_all(bind=engine)
    # create_all does not add columns to existing SQLite databases.
    with engine.begin() as connection:
        columns = connection.exec_driver_sql("PRAGMA table_info(demand_signals)").fetchall()
        if columns and "provenance" not in {row[1] for row in columns}:
            connection.exec_driver_sql(
                "ALTER TABLE demand_signals ADD COLUMN provenance VARCHAR(40) "
                "NOT NULL DEFAULT 'synthetic_demo'"
            )
