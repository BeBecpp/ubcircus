from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..schemas import HealthOut
from ..services.supabase import supabase

router = APIRouter(tags=["health"])
VERSION = "2.0.0"


@router.get("/health", response_model=HealthOut)
def health(db: Session = Depends(get_db)) -> HealthOut:
    """Reports each dependency separately; never masks a broken database with sample content."""
    s = settings()
    try:
        db.execute(text("SELECT 1"))
        database = "ok" if not s.database_url.startswith("sqlite") else "ok:sqlite"
    except Exception as exc:  # noqa: BLE001
        database = f"error:{type(exc).__name__}"
    sb = supabase()
    supabase_state = "configured" if s.supabase_configured else "unconfigured"
    storage = sb.ping() if s.supabase_configured else "unconfigured"
    ok = database.startswith("ok")
    return HealthOut(status="ok" if ok else "degraded", environment=s.environment, database=database, supabase=supabase_state, storage=storage, version=VERSION)
