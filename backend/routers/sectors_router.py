"""sectors_router.py — Sector listing endpoint."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Sector
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["sectors"])


@router.get("/sectors", summary="List all sectors")
def list_sectors(db: Session = Depends(get_db), _=Depends(get_current_user)):
    sectors = db.query(Sector).order_by(Sector.name).all()
    return [{"id": s.id, "name": s.name, "code": s.code} for s in sectors]
