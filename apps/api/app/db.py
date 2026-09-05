from collections.abc import Iterator
from datetime import datetime, timezone

from sqlalchemy import DateTime, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.types import TypeDecorator

from .config import settings


class Base(DeclarativeBase):
    pass


class TZDateTime(TypeDecorator):
    """Store UTC; always hand back timezone-aware UTC datetimes (SQLite drops tzinfo)."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def build_engine(url: str | None = None):
    url = url or settings().database_url
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False}, pool_pre_ping=True)
    return create_engine(url, pool_pre_ping=True, pool_size=3, max_overflow=2, pool_recycle=240, connect_args={"connect_timeout": 10})


engine = build_engine()
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)


def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
