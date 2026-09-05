"""Editorial mutations: apply admin payloads to ORM rows, sanitise rich text, record audit entries."""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models as m
from ..auth import Principal
from ..schemas import ArticleIn, EventIn, GalleryIn, PageIn, VideoIn
from ..security import parse_youtube_id, sanitize_html

LOCALES = ("mn", "en", "tr")


def sync_translations(current: list, incoming: dict, factory, fields: tuple[str, ...]) -> None:
    """Update translation rows in place (unique per locale): reuse, update, remove — no insert-before-delete."""
    by_locale = {row.locale: row for row in current}
    for loc, data in incoming.items():
        row = by_locale.get(loc)
        if row is None:
            row = factory(locale=loc)
            current.append(row)
        for field, value in fields_of(data, fields).items():
            setattr(row, field, value)
    for row in list(current):
        if row.locale not in incoming:
            current.remove(row)


def fields_of(data, fields: tuple[str, ...]) -> dict:
    return {f: data[f] for f in fields}


def audit(db: Session, who: Principal, action: str, resource: str, resource_id: uuid.UUID | str | None, summary: str = "") -> None:
    db.add(m.AuditEntry(actor_id=who.id, actor_email=who.email, action=action, resource=resource, resource_id=str(resource_id or ""), summary=summary[:400]))


def ensure_unique_slug(db: Session, model, slug: str, exclude: uuid.UUID | None) -> None:
    row = db.scalars(select(model).where(model.slug == slug)).first()
    if row is not None and row.id != exclude:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Slug '{slug}' is already used")


def _check_media(db: Session, *ids: uuid.UUID | None) -> None:
    for id_ in ids:
        if id_ is not None and db.get(m.MediaAsset, id_) is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Unknown media asset {id_}")


def _clean_locales(data: dict) -> dict:
    return {loc: v for loc, v in data.items() if loc in LOCALES}


def apply_event(db: Session, event: m.Event, data: EventIn) -> m.Event:
    ensure_unique_slug(db, m.Event, data.slug, event.id)
    _check_media(db, data.poster_id, data.hero_id, *data.gallery_ids)
    if data.category_id and db.get(m.EventCategory, data.category_id) is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unknown category")
    if data.venue_id and db.get(m.Venue, data.venue_id) is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unknown venue")
    if data.video_id and db.get(m.Video, data.video_id) is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unknown video")
    event.slug = data.slug
    event.status = data.status
    event.category_id = data.category_id
    event.venue_id = data.venue_id
    event.duration_minutes = data.duration_minutes
    event.poster_id = data.poster_id
    event.hero_id = data.hero_id
    event.video_id = data.video_id
    event.sample = data.sample
    event.credits = {loc: sanitize_html(v) for loc, v in _clean_locales(data.credits).items()}
    if data.status == "published" and data.published_at is None and event.published_at is None:
        event.published_at = datetime.now(timezone.utc)
    elif data.published_at is not None:
        event.published_at = data.published_at
    sync_translations(
        event.translations,
        {loc: dict(title=t.title.strip(), subtitle=t.subtitle.strip(), excerpt=t.excerpt.strip(), description=sanitize_html(t.description), audience=t.audience.strip(), seo_title=t.seo_title.strip(), seo_description=t.seo_description.strip()) for loc, t in _clean_locales(data.translations).items()},
        m.EventTranslation,
        ("title", "subtitle", "excerpt", "description", "audience", "seo_title", "seo_description"),
    )
    wanted = list(dict.fromkeys(data.gallery_ids))
    for item in list(event.gallery_items):
        if item.media_id not in wanted:
            event.gallery_items.remove(item)
    db.flush()
    present = {item.media_id: item for item in event.gallery_items}
    event.gallery_items = [present.get(mid) or m.EventGalleryItem(media_id=mid) for mid in wanted]
    for i, item in enumerate(event.gallery_items):
        item.display_order = i
    existing = {s.id: s for s in event.sessions}
    sessions = []
    for s in data.sessions:
        row = existing.get(s.id) if s.id else None
        if row is None:
            row = m.EventSession(id=s.id or uuid.uuid4())
        row.starts_at = s.starts_at
        row.ends_at = s.ends_at
        row.status = s.status
        if s.ticket is None:
            row.ticket = None
        else:
            row.ticket = row.ticket or m.TicketLink()
            row.ticket.label = s.ticket.label
            row.ticket.url = s.ticket.url
            row.ticket.price = s.ticket.price
            row.ticket.currency = s.ticket.currency
            row.ticket.note = s.ticket.note
        sessions.append(row)
    event.sessions = sorted(sessions, key=lambda x: x.starts_at)
    event.updated_at = datetime.now(timezone.utc)
    return event


def apply_article(db: Session, article: m.Article, data: ArticleIn) -> m.Article:
    ensure_unique_slug(db, m.Article, data.slug, article.id)
    _check_media(db, data.lead_image_id)
    if data.category_id and db.get(m.ArticleCategory, data.category_id) is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unknown category")
    article.slug = data.slug
    article.status = data.status
    article.category_id = data.category_id
    article.lead_image_id = data.lead_image_id
    article.sample = data.sample
    article.reading_minutes = data.reading_minutes
    if data.status == "published" and data.published_at is None and article.published_at is None:
        article.published_at = datetime.now(timezone.utc)
    elif data.published_at is not None:
        article.published_at = data.published_at
    sync_translations(
        article.translations,
        {loc: dict(title=t.title.strip(), subtitle=t.subtitle.strip(), excerpt=t.excerpt.strip(), body=sanitize_html(t.body), seo_title=t.seo_title.strip(), seo_description=t.seo_description.strip()) for loc, t in _clean_locales(data.translations).items()},
        m.ArticleTranslation,
        ("title", "subtitle", "excerpt", "body", "seo_title", "seo_description"),
    )
    return article


def apply_video(db: Session, video: m.Video, data: VideoIn) -> m.Video:
    _check_media(db, data.poster_id)
    youtube_id = parse_youtube_id(data.youtube_url) if data.youtube_url else None
    if data.youtube_url and youtube_id is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unrecognised YouTube URL")
    video.youtube_id = youtube_id
    video.poster_id = data.poster_id
    video.featured = data.featured
    video.display_order = data.display_order
    video.status = data.status
    video.sample = data.sample
    sync_translations(video.translations, {loc: dict(title=t.title.strip(), subtitle=t.subtitle.strip(), description=sanitize_html(t.description)) for loc, t in _clean_locales(data.translations).items()}, m.VideoTranslation, ("title", "subtitle", "description"))
    return video


def apply_gallery(db: Session, gallery: m.Gallery, data: GalleryIn) -> m.Gallery:
    ensure_unique_slug(db, m.Gallery, data.slug, gallery.id)
    _check_media(db, *[i.media_id for i in data.items])
    gallery.slug = data.slug
    gallery.status = data.status
    gallery.category = data.category
    gallery.sample = data.sample
    sync_translations(gallery.translations, {loc: dict(title=t.title.strip(), description=sanitize_html(t.description)) for loc, t in _clean_locales(data.translations).items()}, m.GalleryTranslation, ("title", "description"))
    gallery.items.clear()
    db.flush()
    gallery.items = [m.GalleryItem(media_id=i.media_id, display_order=n, caption=i.caption) for n, i in enumerate(data.items)]
    return gallery


def apply_page(db: Session, page: m.Page, data: PageIn) -> m.Page:
    ensure_unique_slug(db, m.Page, data.slug, page.id)
    page.slug = data.slug
    page.status = data.status
    page.settings = data.settings
    sync_translations(page.translations, {loc: dict(title=t.title.strip(), subtitle=t.subtitle.strip(), body=sanitize_html(t.body), seo_title=t.seo_title.strip(), seo_description=t.seo_description.strip()) for loc, t in _clean_locales(data.translations).items()}, m.PageTranslation, ("title", "subtitle", "body", "seo_title", "seo_description"))
    return page


def media_usage(db: Session, media_id: uuid.UUID) -> list[dict]:
    """Where an asset is referenced — used before deletion and shown in the library."""
    uses: list[dict] = []
    for e in db.scalars(select(m.Event).where((m.Event.poster_id == media_id) | (m.Event.hero_id == media_id))).unique():
        uses.append({"resource": "event", "id": str(e.id), "label": e.slug, "field": "poster/hero"})
    for gi in db.scalars(select(m.EventGalleryItem).where(m.EventGalleryItem.media_id == media_id)):
        uses.append({"resource": "event", "id": str(gi.event_id), "label": "gallery", "field": "gallery"})
    for a in db.scalars(select(m.Article).where(m.Article.lead_image_id == media_id)).unique():
        uses.append({"resource": "article", "id": str(a.id), "label": a.slug, "field": "lead_image"})
    for v in db.scalars(select(m.Video).where(m.Video.poster_id == media_id)).unique():
        uses.append({"resource": "video", "id": str(v.id), "label": v.youtube_id or "video", "field": "poster"})
    for gi in db.scalars(select(m.GalleryItem).where(m.GalleryItem.media_id == media_id)):
        uses.append({"resource": "gallery", "id": str(gi.gallery_id), "label": "gallery", "field": "item"})
    for hi in db.scalars(select(m.HomepageSectionItem).where((m.HomepageSectionItem.resource == "media") & (m.HomepageSectionItem.resource_id == media_id))):
        uses.append({"resource": "homepage", "id": str(hi.section_id), "label": "homepage", "field": "item"})
    return uses
