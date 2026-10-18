"""geo_router.py — State and district geography endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import State, District
from auth import get_current_user

router = APIRouter(prefix="/api/geo", tags=["geography"])


@router.get("/states", summary="List all pilot states")
def list_states(db: Session = Depends(get_db), _=Depends(get_current_user)):
    states = db.query(State).order_by(State.name).all()
    return [{"id": s.id, "name": s.name, "code": s.code} for s in states]


@router.get("/districts", summary="List districts, optionally filtered by state")
def list_districts(
    state_id: int = Query(None, description="Filter by state ID"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(District)
    if state_id:
        q = q.filter(District.state_id == state_id)
    districts = q.order_by(District.name).all()
    return [
        {"id": d.id, "name": d.name, "state_id": d.state_id, "is_aspirational": d.is_aspirational}
        for d in districts
    ]
