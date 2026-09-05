"""Public content queries. Mirrors apps/web/lib/content/select.ts and demo.ts semantics."""

import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models as m
from ..schemas import AboutFeatureOut, ArticleOut, CategoryOut, EventOut, HeroOut, HomepageOut, MediaAssetOut, PerformanceOut, SectionFlag, SessionOut, SiteSettingsOut, VenueOut, VideoOut

UB = ZoneInfo("Asia/Ulaanbaatar")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def day_key(dt: datetime) -> str:
    return dt.astimezone(UB).strftime("%Y-%m-%d")


def month_key(dt: datetime) -> str:
    return dt.astimezone(UB).strftime("%Y-%m")


def published_events(db: Session) -> list[m.Event]:
    return list(db.scalars(select(m.Event).where(m.Event.status == "published")).unique())


def all_sessions(events: list[m.Event]) -> list[tuple[m.EventSession, m.Event]]:
    pairs = [(s, e) for e in events for s in e.sessions]
    pairs.sort(key=lambda p: p[0].starts_at)
    return pairs


def next_session(event: m.Event, now: datetime) -> m.EventSession | None:
    for s in sorted(event.sessions, key=lambda x: x.starts_at):
        if s.starts_at >= now:
            return s
    return None


def last_session(event: m.Event) -> m.EventSession | None:
    return max(event.sessions, key=lambda x: x.starts_at, default=None)


def has_upcoming(event: m.Event, now: datetime) -> bool:
    return any(s.starts_at >= now for s in event.sessions)


def sort_by_next(events: list[m.Event], now: datetime) -> list[m.Event]:
    def key(e: m.Event):
        n = next_session(e, now)
        if n:
            return (0, n.starts_at)
        last = last_session(e)
        return (1, last.starts_at if last else datetime.max.replace(tzinfo=timezone.utc))

    return sorted(events, key=key)


def filter_events(events: list[m.Event], range_: str | None, category: str | None, month: str | None, date: str | None, now: datetime) -> list[m.Event]:
    today = day_key(now)
    week_end = (now.astimezone(UB) + timedelta(days=7)).strftime("%Y-%m-%d")
    this_month = month_key(now)
    out = []
    for e in events:
        if category and (e.category is None or e.category.slug != category):
            continue
        keys = [day_key(s.starts_at) for s in e.sessions]
        if date:
            if date in keys:
                out.append(e)
            continue
        if month:
            if any(month_key(s.starts_at) == month for s in e.sessions):
                out.append(e)
            continue
        if range_ == "past":
            ok = bool(e.sessions) and not has_upcoming(e, now)
        elif range_ == "week":
            ok = any(s.starts_at >= now and day_key(s.starts_at) <= week_end for s in e.sessions)
        elif range_ == "month":
            ok = any(s.starts_at >= now and month_key(s.starts_at) == this_month for s in e.sessions)
        elif range_ == "all":
            ok = True
        else:
            ok = has_upcoming(e, now)
        if ok:
            out.append(e)
    del today
    return out


def performance(session: m.EventSession, event: m.Event) -> PerformanceOut:
    return PerformanceOut(session=SessionOut.model_validate(session), event=EventOut.model_validate(event))


def settings_out(db: Session) -> SiteSettingsOut:
    rows = {r.key: r.value for r in db.scalars(select(m.SiteSetting))}
    return SiteSettingsOut(site=rows.get("site", {}), locales=rows.get("locales", {"enabled": ["mn", "en", "tr"], "default": "mn"}), seo=rows.get("seo", {}), contact=rows.get("contact", {"categories": ["general", "tickets", "partnership", "press", "venue"]}))


def homepage(db: Session, now: datetime | None = None) -> HomepageOut:
    now = now or now_utc()
    events = published_events(db)
    by_id = {e.id: e for e in events}
    articles = {a.id: a for a in db.scalars(select(m.Article).where(m.Article.status == "published")).unique()}
    videos = {v.id: v for v in db.scalars(select(m.Video).where(m.Video.status == "published")).unique()}
    media = {a.id: a for a in db.scalars(select(m.MediaAsset))}
    sections = sorted(db.scalars(select(m.HomepageSection)).unique(), key=lambda s: s.display_order)
    by_kind = {s.kind: s for s in sections}

    def pick(kind: str, pool: dict):
        section = by_kind.get(kind)
        if not section:
            return []
        return [pool[i.resource_id] for i in sorted(section.items, key=lambda i: i.display_order) if i.resource_id in pool]

    hero = by_kind.get("hero_orbit")
    next_section = by_kind.get("next_on_stage")
    limit = int((next_section.settings or {}).get("limit", 4)) if next_section else 4
    pinned = pick("next_on_stage", by_id)
    pool = pinned or events
    seen: set[uuid.UUID] = set()
    next_on_stage: list[PerformanceOut] = []
    for s, e in all_sessions(pool):
        if s.starts_at < now or e.id in seen:
            continue
        seen.add(e.id)
        next_on_stage.append(performance(s, e))
        if len(next_on_stage) >= limit:
            break

    about_section = by_kind.get("about_feature")
    about = None
    if about_section and about_section.enabled:
        st = about_section.settings or {}
        image_id = st.get("image_id")
        image = None
        if image_id:
            try:
                image = media.get(uuid.UUID(str(image_id)))
            except ValueError:
                image = None
        about = AboutFeatureOut(year_label=str(st.get("year_label", "")), year_caption=st.get("year_caption", {}) or {}, title=st.get("title", {}) or {}, body=st.get("body", {}) or {}, image=MediaAssetOut.model_validate(image) if image else None, href=str(st.get("href", "/about")))

    visit_section = by_kind.get("plan_your_visit")
    venue = None
    venue_id = (visit_section.settings or {}).get("venue_id") if visit_section else None
    if venue_id:
        try:
            venue = db.get(m.Venue, uuid.UUID(str(venue_id)))
        except ValueError:
            venue = None
    if venue is None:
        venue = db.scalars(select(m.Venue).order_by(m.Venue.created_at)).first()

    whats_on_limit = int((by_kind["whats_on"].settings or {}).get("limit", 8)) if "whats_on" in by_kind else 8
    featured_video = pick("featured_video", videos)
    video = featured_video[0] if featured_video else next((v for v in videos.values() if v.featured), None)
    categories = sorted(db.scalars(select(m.EventCategory)), key=lambda c: c.display_order)

    return HomepageOut(
        sections=[SectionFlag(kind=s.kind, enabled=s.enabled) for s in sections],
        hero=HeroOut(caption=((hero.settings or {}).get("caption", {}) if hero else {}) or {}, events=[EventOut.model_validate(e) for e in pick("hero_orbit", by_id)]),
        next_on_stage=next_on_stage,
        featured=[EventOut.model_validate(e) for e in pick("featured_performances", by_id)],
        whats_on=[EventOut.model_validate(e) for e in sort_by_next([e for e in events if has_upcoming(e, now)], now)[:whats_on_limit]],
        video=VideoOut.model_validate(video) if video else None,
        in_motion=[MediaAssetOut.model_validate(a) for a in pick("in_motion", media)],
        stories=[ArticleOut.model_validate(a) for a in pick("stories", articles)],
        about=about,
        visit=VenueOut.model_validate(venue) if venue else None,
        categories=[CategoryOut.model_validate(c) for c in categories],
    )
