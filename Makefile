.PHONY: setup seed pipeline dev-backend test clean help

help:
	@echo "AI-LMIS Phase 1 — Available commands:"
	@echo "  make setup        Install backend Python dependencies"
	@echo "  make seed         Generate synthetic demo data"
	@echo "  make pipeline     Run analytical pipeline"
	@echo "  make dev-backend  Start FastAPI development server"
	@echo "  make test         Run all backend tests"
	@echo "  make clean        Remove the SQLite database"
	@echo "  make dev          seed + pipeline + dev-backend"

setup:
	cd backend && pip install -r requirements.txt

seed:
	cd backend && python -m seed.generate

pipeline:
	cd backend && python -m pipeline.run

dev-backend:
	cd backend && uvicorn main:app --reload --port 8000

dev: seed pipeline dev-backend

test:
	cd backend && pytest tests/ -v

clean:
	rm -f backend/data/lmis.db
	@echo "Database removed."
