"""External adapter status and test endpoints."""
from fastapi import APIRouter, Depends

from auth import get_current_user
from adapters.source_registry import get_source_statuses, test_source

router = APIRouter(prefix="/api/v1", tags=["external-sources"])


@router.get("/system/sources", summary="External source status and provenance")
def external_source_status(_=Depends(get_current_user)):
    return {"sources": get_source_statuses()}


@router.post("/admin/sources/{source}/test", summary="Test an external source connection")
def test_external_source(source: str, _=Depends(get_current_user)):
    """The existing single-user JWT is the application's admin/API authorization."""
    return test_source(source)
