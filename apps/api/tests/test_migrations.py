"""Alembic migrations must build the same schema as the models (checked on SQLite) and the
Postgres-only security statements must at least be well-formed."""

import os
import subprocess
import sys
from pathlib import Path

import sqlalchemy as sa

ROOT = Path(__file__).resolve().parent.parent


def test_alembic_upgrade_matches_models(tmp_path):
    db = tmp_path / "migrate.db"
    env = dict(os.environ, DATABASE_URL=f"sqlite:///{db.as_posix()}")
    run = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=ROOT, env=env, capture_output=True, text=True)
    assert run.returncode == 0, run.stderr
    from app.db import Base

    engine = sa.create_engine(f"sqlite:///{db.as_posix()}")
    inspector = sa.inspect(engine)
    migrated = set(inspector.get_table_names()) - {"alembic_version"}
    expected = set(Base.metadata.tables)
    assert migrated == expected, migrated ^ expected
    for table in expected:
        model_cols = set(Base.metadata.tables[table].columns.keys())
        db_cols = {c["name"] for c in inspector.get_columns(table)}
        assert model_cols == db_cols, (table, model_cols ^ db_cols)
    down = subprocess.run([sys.executable, "-m", "alembic", "downgrade", "base"], cwd=ROOT, env=env, capture_output=True, text=True)
    assert down.returncode == 0, down.stderr
    engine.dispose()


def test_postgres_security_statements_present():
    from app.db_security import POSTGRES_SECURITY

    joined = "\n".join(POSTGRES_SECURITY)
    for table in ("events", "event_sessions", "profiles", "media_assets", "contact_messages", "audit_entries", "rate_limit_buckets", "site_settings"):
        assert f"alter table public.{table} enable row level security" in joined, table
    assert "create or replace function public.is_staff()" in joined
    assert "set search_path = ''" in joined
    assert "references auth.users(id)" in joined
    assert "storage.buckets" in joined
    assert "raw_user_meta_data" not in joined and "user_metadata" not in joined
