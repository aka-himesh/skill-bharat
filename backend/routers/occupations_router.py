"""occupations_router.py — Occupation search and listing endpoint."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
from models import Occupation, Sector
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["occupations"])


@router.get("/occupations", summary="Search occupations by name or NCO code")
def search_occupations(
    q: str = Query(None, description="Search query (name or NCO code)"),
    sector_id: int = Query(None, description="Filter by sector ID"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(Occupation)
    if q:
        query = query.filter(
            or_(
                Occupation.name.ilike(f"%{q}%"),
                Occupation.nco_code.ilike(f"%{q}%"),
            )
        )
    if sector_id:
        query = query.filter(Occupation.sector_id == sector_id)

    total = query.count()
    occs = query.order_by(Occupation.name).offset(offset).limit(limit).all()

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "results": [
            {
                "id": o.id,
                "nco_code": o.nco_code,
                "name": o.name,
                "family": o.family,
                "sector_id": o.sector_id,
                "nsqf_level": o.nsqf_level,
                "source": o.source,
                "is_uncertain": o.is_uncertain,
            }
            for o in occs
        ],
    }
