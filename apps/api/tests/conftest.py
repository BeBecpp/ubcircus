import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
DB_PATH = Path(os.environ.get("TEST_DB_PATH", str(ROOT / "test_ubcircus.db")))
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH.as_posix()}"
os.environ["ENVIRONMENT"] = "development"
os.environ["DEV_AUTH_TOKEN"] = "dev-token-for-tests"
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_SECRET_KEY"] = ""
os.environ.pop("VERCEL", None)

from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, engine, SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.services.seed import seed  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def database():
    if DB_PATH.exists():
        DB_PATH.unlink()
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    yield
    engine.dispose()
    if DB_PATH.exists():
        DB_PATH.unlink()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth() -> dict:
    return {"Authorization": "Bearer dev-token-for-tests"}
