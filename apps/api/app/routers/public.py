"""Read-only public content. Only published rows are ever exposed."""

import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models as m
from ..config import settings
from ..db import get_db
from ..schemas import ArticleOut, CategoryOut, ContactIn, EventOut, GalleryOut, HomepageOut, MediaAssetOut, NavigationItemOut, PageOut, PerformanceOut, SiteSettingsOut, VenueOut, VideoOut
from ..security import hash_ip
from ..services import content as svc

router = APIRouter(prefix="/api/v1", tags=["public"])
MONTH = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
DAY = re.compile(r"^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$")


@router.get("/homepage", response_model=HomepageOut)
def homepage(db: Session = Depends(get_db)) -> HomepageOut:
    return svc.homepage(db)


@router.get("/events", response_model=list[EventOut])
def events(
    db: Session = Depends(get_db),
    range: str | None = Query(default=None, pattern="^(upcoming|past|all|week|month)$"),
    category: str | None = Query(default=None, max_length=100),
    month: str | None = None,
    date: str | None = None,
    limit: int | None = Query(default=None, ge=1, le=200),
) -> list[EventOut]:
    if month and not MONTH.match(month):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "month must be YYYY-MM")
    if date and not DAY.match(date):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "date must be YYYY-MM-DD")
    now = svc.now_utc()
    rows = svc.filter_events(svc.published_events(db), range or "all", category, month, date, now)
    rows = svc.sort_by_next(rows, now)
    if limit:
        rows = rows[:limit]
    return [EventOut.model_validate(e) for e in rows]


@router.get("/events/{slug}", response_model=EventOut)
def event(slug: str, db: Session = Depends(get_db)) -> EventOut:
    row = db.scalars(select(m.Event).where(m.Event.slug == slug, m.Event.status == "published")).unique().first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    return EventOut.model_validate(row)


@router.get("/calendar", response_model=list[PerformanceOut])
def calendar(month: str = Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$"), db: Session = Depends(get_db)) -> list[PerformanceOut]:
    pairs = svc.all_sessions(svc.published_events(db))
    return [svc.performance(s, e) for s, e in pairs if svc.month_key(s.starts_at) == month]


@router.get("/articles", response_model=list[ArticleOut])
def articles(limit: int | None = Query(default=None, ge=1, le=100), db: Session = Depends(get_db)) -> list[ArticleOut]:
    rows = list(db.scalars(select(m.Article).where(m.Article.status == "published").order_by(m.Article.published_at.desc())).unique())
    if limit:
        rows = rows[:limit]
    return [ArticleOut.model_validate(a) for a in rows]


@router.get("/articles/{slug}", response_model=ArticleOut)
def article(slug: str, db: Session = Depends(get_db)) -> ArticleOut:
    row = db.scalars(select(m.Article).where(m.Article.slug == slug, m.Article.status == "published")).unique().first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Story not found")
    return ArticleOut.model_validate(row)


@router.get("/videos", response_model=list[VideoOut])
def videos(db: Session = Depends(get_db)) -> list[VideoOut]:
    rows = db.scalars(select(m.Video).where(m.Video.status == "published").order_by(m.Video.display_order)).unique()
    return [VideoOut.model_validate(v) for v in rows]


@router.get("/galleries", response_model=list[GalleryOut])
def galleries(db: Session = Depends(get_db)) -> list[GalleryOut]:
    rows = db.scalars(select(m.Gallery).where(m.Gallery.status == "published").order_by(m.Gallery.created_at)).unique()
    return [GalleryOut.model_validate(g) for g in rows]


@router.get("/media", response_model=list[MediaAssetOut])
def media(db: Session = Depends(get_db)) -> list[MediaAssetOut]:
    rows = db.scalars(select(m.MediaAsset).order_by(m.MediaAsset.created_at))
    return [MediaAssetOut.model_validate(a) for a in rows]


@router.get("/pages/{slug}", response_model=PageOut)
def page(slug: str, db: Session = Depends(get_db)) -> PageOut:
    row = db.scalars(select(m.Page).where(m.Page.slug == slug, m.Page.status == "published")).unique().first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Page not found")
    return PageOut.model_validate(row)


@router.get("/venues", response_model=list[VenueOut])
def venues(db: Session = Depends(get_db)) -> list[VenueOut]:
    return [VenueOut.model_validate(v) for v in db.scalars(select(m.Venue).order_by(m.Venue.created_at))]


@router.get("/categories", response_model=list[CategoryOut])
def categories(kind: str | None = Query(default=None, pattern="^(event|article)$"), db: Session = Depends(get_db)) -> list[CategoryOut]:
    out: list[CategoryOut] = []
    if kind in (None, "event"):
        out += [CategoryOut(id=c.id, slug=c.slug, labels=c.labels, display_order=c.display_order, kind="event") for c in db.scalars(select(m.EventCategory).order_by(m.EventCategory.display_order))]
    if kind in (None, "article"):
        out += [CategoryOut(id=c.id, slug=c.slug, labels=c.labels, display_order=c.display_order, kind="article") for c in db.scalars(select(m.ArticleCategory).order_by(m.ArticleCategory.display_order))]
    return out


@router.get("/navigation", response_model=list[NavigationItemOut])
def navigation(db: Session = Depends(get_db)) -> list[NavigationItemOut]:
    return [NavigationItemOut.model_validate(n) for n in db.scalars(select(m.NavigationItem).order_by(m.NavigationItem.group, m.NavigationItem.display_order))]


@router.get("/settings", response_model=SiteSettingsOut)
def site_settings(db: Session = Depends(get_db)) -> SiteSettingsOut:
    return svc.settings_out(db)


def _rate_limit(db: Session, key: str, limit: int, window: int) -> None:
    now = datetime.now(timezone.utc)
    bucket = db.get(m.RateLimitBucket, key)
    if bucket is None or bucket.expires_at < now:
        try:
            with db.begin_nested():
                if bucket is None:
                    db.add(m.RateLimitBucket(key=key, count=1, expires_at=now + timedelta(seconds=window)))
                else:
                    bucket.count = 1
                    bucket.expires_at = now + timedelta(seconds=window)
            return
        except IntegrityError:
            bucket = db.get(m.RateLimitBucket, key)
    bucket.count += 1
    if bucket.count > limit:
        db.commit()
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many messages. Please try again later.")


@router.post("/contact", status_code=202)
def contact(payload: ContactIn, request: Request, db: Session = Depends(get_db)) -> dict:
    if payload.website:  # honeypot filled by a bot → pretend success
        return {"ok": True}
    s = settings()
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "0.0.0.0").split(",")[0].strip()
    ip_hash = hash_ip(ip)
    _rate_limit(db, f"contact:{ip_hash}", s.contact_rate_limit, s.contact_rate_window_seconds)
    categories = svc.settings_out(db).contact.get("categories", [])
    if categories and payload.category not in categories:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unknown category")
    db.add(m.ContactMessage(name=payload.name.strip(), email=str(payload.email), category=payload.category, message=payload.message.strip(), locale=payload.locale, ip_hash=ip_hash))
    db.commit()
    return {"ok": True}
