"""Backstage API: every route requires a validated Supabase token and an active staff profile."""

import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .. import models as m
from ..auth import Principal, require_admin, require_staff
from ..config import settings
from ..db import get_db
from ..schemas import (ArticleIn, ArticleOut, AuditOut, CategoryIn, CategoryOut, ContactMessageOut, DashboardOut, EventIn, EventOut, FinalizeUploadIn, GalleryIn, GalleryOut, HomepageSectionIn, HomepageSectionOut, InviteIn, MediaAssetOut, MediaMetaIn, NavigationItemIn, NavigationItemOut, PageIn, PageOut, ProfileOut, ProfileUpdateIn, SettingIn, UploadRequestIn, UploadTicketOut, VenueIn, VenueOut, VideoIn, VideoOut)
from ..services import content as svc
from ..services.admin import apply_article, apply_event, apply_gallery, apply_page, apply_video, audit, ensure_unique_slug, media_usage
from ..services.supabase import ALLOWED_MIME, supabase

router = APIRouter(prefix="/api/v1/admin", tags=["admin"], dependencies=[Depends(require_staff)])


def _get_or_404(db: Session, model, id_: uuid.UUID, label: str):
    row = db.get(model, id_)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{label} not found")
    return row


# ---------------------------------------------------------------- me / dashboard
@router.get("/me", response_model=ProfileOut)
def me(who: Principal = Depends(require_staff)) -> ProfileOut:
    return ProfileOut.model_validate(who.profile)


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db)) -> DashboardOut:
    now = svc.now_utc()
    events = list(db.scalars(select(m.Event)).unique())
    published = [e for e in events if e.status == "published"]
    pairs = [(s, e) for s, e in svc.all_sessions(published) if s.starts_at >= now]
    upcoming = [svc.performance(s, e) for s, e in pairs[:12]]
    in_7 = sum(1 for s, _ in pairs if s.starts_at <= now + timedelta(days=7))
    in_30 = sum(1 for s, _ in pairs if s.starts_at <= now + timedelta(days=30))
    videos = list(db.scalars(select(m.Video)).unique())
    return DashboardOut(
        now=now,
        next_performance=upcoming[0] if upcoming else None,
        next_7_days=in_7,
        next_30_days=in_30,
        upcoming_sessions=upcoming,
        published_events=len(published),
        draft_events=sum(1 for e in events if e.status == "draft"),
        draft_stories=db.scalar(select(func.count()).select_from(m.Article).where(m.Article.status == "draft")) or 0,
        published_stories=db.scalar(select(func.count()).select_from(m.Article).where(m.Article.status == "published")) or 0,
        video_count=len(videos),
        videos_without_id=sum(1 for v in videos if not v.youtube_id),
        sessions_without_tickets=sum(1 for s, _ in pairs if s.status == "scheduled" and (s.ticket is None or not s.ticket.url)),
        recent_media=[MediaAssetOut.model_validate(a) for a in db.scalars(select(m.MediaAsset).order_by(m.MediaAsset.created_at.desc()).limit(8))],
        recent_edits=[AuditOut.model_validate(a) for a in db.scalars(select(m.AuditEntry).order_by(m.AuditEntry.created_at.desc()).limit(10))],
        unresolved_messages=db.scalar(select(func.count()).select_from(m.ContactMessage).where(m.ContactMessage.resolved.is_(False))) or 0,
    )


# ---------------------------------------------------------------- events
@router.get("/events", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db), q: str | None = None, status_: str | None = Query(default=None, alias="status")) -> list[EventOut]:
    stmt = select(m.Event)
    if status_:
        stmt = stmt.where(m.Event.status == status_)
    if q:
        stmt = stmt.join(m.EventTranslation).where(or_(m.Event.slug.ilike(f"%{q}%"), m.EventTranslation.title.ilike(f"%{q}%")))
    rows = list(db.scalars(stmt).unique())
    return [EventOut.model_validate(e) for e in svc.sort_by_next(rows, svc.now_utc())]


@router.post("/events", response_model=EventOut, status_code=201)
def create_event(data: EventIn, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> EventOut:
    event = m.Event()
    apply_event(db, event, data)
    db.add(event)
    audit(db, who, "create", "event", event.id, data.slug)
    db.commit()
    db.refresh(event)
    return EventOut.model_validate(event)


@router.get("/events/{event_id}", response_model=EventOut)
def get_event(event_id: uuid.UUID, db: Session = Depends(get_db)) -> EventOut:
    return EventOut.model_validate(_get_or_404(db, m.Event, event_id, "Event"))


@router.put("/events/{event_id}", response_model=EventOut)
def update_event(event_id: uuid.UUID, data: EventIn, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> EventOut:
    event = _get_or_404(db, m.Event, event_id, "Event")
    apply_event(db, event, data)
    audit(db, who, "update", "event", event.id, data.slug)
    db.commit()
    db.refresh(event)
    return EventOut.model_validate(event)


@router.post("/events/{event_id}/status", response_model=EventOut)
def set_event_status(event_id: uuid.UUID, value: str = Query(pattern="^(draft|scheduled|published|cancelled|archived)$"), db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> EventOut:
    event = _get_or_404(db, m.Event, event_id, "Event")
    event.status = value
    if value == "published" and event.published_at is None:
        event.published_at = svc.now_utc()
    audit(db, who, value, "event", event.id, event.slug)
    db.commit()
    db.refresh(event)
    return EventOut.model_validate(event)


@router.delete("/events/{event_id}", status_code=204)
def delete_event(event_id: uuid.UUID, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> None:
    event = _get_or_404(db, m.Event, event_id, "Event")
    db.execute(m.HomepageSectionItem.__table__.delete().where(m.HomepageSectionItem.resource_id == event_id))
    audit(db, who, "delete", "event", event.id, event.slug)
    db.delete(event)
    db.commit()


# ---------------------------------------------------------------- categories
def _cat_model(kind: str):
    return m.EventCategory if kind == "event" else m.ArticleCategory


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(kind: str = Query(default="event", pattern="^(event|article)$"), db: Session = Depends(get_db)) -> list[CategoryOut]:
    model = _cat_model(kind)
    return [CategoryOut(id=c.id, slug=c.slug, labels=c.labels, display_order=c.display_order, kind=kind) for c in db.scalars(select(model).order_by(model.display_order))]


@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(data: CategoryIn, kind: str = Query(default="event", pattern="^(event|article)$"), db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> CategoryOut:
    model = _cat_model(kind)
    ensure_unique_slug(db, model, data.slug, None)
    row = model(slug=data.slug, labels=data.labels, display_order=data.display_order)
    db.add(row)
    audit(db, who, "create", f"{kind}_category", None, data.slug)
    db.commit()
    return CategoryOut(id=row.id, slug=row.slug, labels=row.labels, display_order=row.display_order, kind=kind)


@router.put("/categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: uuid.UUID, data: CategoryIn, kind: str = Query(default="event", pattern="^(event|article)$"), db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> CategoryOut:
    model = _cat_model(kind)
    row = _get_or_404(db, model, category_id, "Category")
    ensure_unique_slug(db, model, data.slug, row.id)
    row.slug, row.labels, row.display_order = data.slug, data.labels, data.display_order
    audit(db, who, "update", f"{kind}_category", row.id, data.slug)
    db.commit()
    return CategoryOut(id=row.id, slug=row.slug, labels=row.labels, display_order=row.display_order, kind=kind)


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(category_id: uuid.UUID, kind: str = Query(default="event", pattern="^(event|article)$"), db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> None:
    row = _get_or_404(db, _cat_model(kind), category_id, "Category")
    audit(db, who, "delete", f"{kind}_category", row.id, row.slug)
    db.delete(row)
    db.commit()


# ---------------------------------------------------------------- articles
@router.get("/articles", response_model=list[ArticleOut])
def list_articles(db: Session = Depends(get_db), status_: str | None = Query(default=None, alias="status")) -> list[ArticleOut]:
    stmt = select(m.Article).order_by(m.Article.updated_at.desc())
    if status_:
        stmt = stmt.where(m.Article.status == status_)
    return [ArticleOut.model_validate(a) for a in db.scalars(stmt).unique()]


@router.post("/articles", response_model=ArticleOut, status_code=201)
def create_article(data: ArticleIn, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> ArticleOut:
    article = m.Article()
    apply_article(db, article, data)
    db.add(article)
    audit(db, who, "create", "article", article.id, data.slug)
    db.commit()
    db.refresh(article)
    return ArticleOut.model_validate(article)


@router.get("/articles/{article_id}", response_model=ArticleOut)
def get_article(article_id: uuid.UUID, db: Session = Depends(get_db)) -> ArticleOut:
    return ArticleOut.model_validate(_get_or_404(db, m.Article, article_id, "Story"))


@router.put("/articles/{article_id}", response_model=ArticleOut)
def update_article(article_id: uuid.UUID, data: ArticleIn, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> ArticleOut:
    article = _get_or_404(db, m.Article, article_id, "Story")
    apply_article(db, article, data)
    audit(db, who, "update", "article", article.id, data.slug)
    db.commit()
    db.refresh(article)
    return ArticleOut.model_validate(article)


@router.delete("/articles/{article_id}", status_code=204)
def delete_article(article_id: uuid.UUID, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> None:
    article = _get_or_404(db, m.Article, article_id, "Story")
    db.execute(m.HomepageSectionItem.__table__.delete().where(m.HomepageSectionItem.resource_id == article_id))
    audit(db, who, "delete", "article", article.id, article.slug)
    db.delete(article)
    db.commit()


# ---------------------------------------------------------------- videos
@router.get("/videos", response_model=list[VideoOut])
def list_videos(db: Session = Depends(get_db)) -> list[VideoOut]:
    return [VideoOut.model_validate(v) for v in db.scalars(select(m.Video).order_by(m.Video.display_order)).unique()]


@router.post("/videos", response_model=VideoOut, status_code=201)
def create_video(data: VideoIn, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> VideoOut:
    video = m.Video()
    apply_video(db, video, data)
    db.add(video)
    audit(db, who, "create", "video", video.id, data.youtube_url or "")
    db.commit()
    db.refresh(video)
    return VideoOut.model_validate(video)


@router.put("/videos/{video_id}", response_model=VideoOut)
def update_video(video_id: uuid.UUID, data: VideoIn, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> VideoOut:
    video = _get_or_404(db, m.Video, video_id, "Video")
    apply_video(db, video, data)
    audit(db, who, "update", "video", video.id, data.youtube_url or "")
    db.commit()
    db.refresh(video)
    return VideoOut.model_validate(video)


@router.delete("/videos/{video_id}", status_code=204)
def delete_video(video_id: uuid.UUID, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> None:
    video = _get_or_404(db, m.Video, video_id, "Video")
    db.execute(m.HomepageSectionItem.__table__.delete().where(m.HomepageSectionItem.resource_id == video_id))
    audit(db, who, "delete", "video", video.id)
    db.delete(video)
    db.commit()


# ---------------------------------------------------------------- galleries
@router.get("/galleries", response_model=list[GalleryOut])
def list_galleries(db: Session = Depends(get_db)) -> list[GalleryOut]:
    return [GalleryOut.model_validate(g) for g in db.scalars(select(m.Gallery).order_by(m.Gallery.created_at)).unique()]


@router.post("/galleries", response_model=GalleryOut, status_code=201)
def create_gallery(data: GalleryIn, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> GalleryOut:
    gallery = m.Gallery()
    apply_gallery(db, gallery, data)
    db.add(gallery)
    audit(db, who, "create", "gallery", gallery.id, data.slug)
    db.commit()
    db.refresh(gallery)
    return GalleryOut.model_validate(gallery)


@router.put("/galleries/{gallery_id}", response_model=GalleryOut)
def update_gallery(gallery_id: uuid.UUID, data: GalleryIn, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> GalleryOut:
    gallery = _get_or_404(db, m.Gallery, gallery_id, "Gallery")
    apply_gallery(db, gallery, data)
    audit(db, who, "update", "gallery", gallery.id, data.slug)
    db.commit()
    db.refresh(gallery)
    return GalleryOut.model_validate(gallery)


@router.delete("/galleries/{gallery_id}", status_code=204)
def delete_gallery(gallery_id: uuid.UUID, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> None:
    gallery = _get_or_404(db, m.Gallery, gallery_id, "Gallery")
    audit(db, who, "delete", "gallery", gallery.id, gallery.slug)
    db.delete(gallery)
    db.commit()


# ---------------------------------------------------------------- media library
@router.get("/media", response_model=list[MediaAssetOut])
def list_media(db: Session = Depends(get_db), q: str | None = None, category: str | None = None, kind: str | None = None, limit: int = Query(default=200, le=500), offset: int = 0) -> list[MediaAssetOut]:
    stmt = select(m.MediaAsset).order_by(m.MediaAsset.created_at.desc())
    if category:
        stmt = stmt.where(m.MediaAsset.category == category)
    if kind:
        stmt = stmt.where(m.MediaAsset.kind == kind)
    if q:
        stmt = stmt.where(or_(m.MediaAsset.file_name.ilike(f"%{q}%"), m.MediaAsset.credit.ilike(f"%{q}%"), m.MediaAsset.photographer.ilike(f"%{q}%")))
    return [MediaAssetOut.model_validate(a) for a in db.scalars(stmt.offset(offset).limit(limit))]


@router.post("/media/upload-url", response_model=UploadTicketOut)
def upload_url(data: UploadRequestIn, who: Principal = Depends(require_staff), db: Session = Depends(get_db)) -> UploadTicketOut:
    """Issue a short-lived signed upload URL. The browser uploads directly to Storage; the secret key never leaves the API."""
    s = settings()
    if data.mime_type not in ALLOWED_MIME:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Unsupported file type {data.mime_type}")
    if data.mime_type == "image/svg+xml" and not who.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only administrators may upload SVG files")
    if data.size > s.max_upload_bytes:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, f"Files must be under {s.max_upload_bytes // (1024 * 1024)} MB")
    sb = supabase()
    if data.replace_id:
        existing = _get_or_404(db, m.MediaAsset, data.replace_id, "Media asset")
        key = existing.object_key or sb.object_key(data.file_name, data.mime_type)
        ticket = sb.signed_upload(key, upsert=True)
    else:
        key = sb.object_key(data.file_name, data.mime_type)
        ticket = sb.signed_upload(key)
    return UploadTicketOut(upload_url=ticket["upload_url"], token=ticket["token"], object_key=key, public_url=ticket["public_url"], headers=ticket["headers"])


@router.post("/media/finalize", response_model=MediaAssetOut, status_code=201)
def finalize_upload(data: FinalizeUploadIn, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> MediaAssetOut:
    """Verify the object exists in Storage, then register (or update) the asset record."""
    sb = supabase()
    if data.mime_type not in ALLOWED_MIME:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unsupported file type")
    head = sb.head_object(data.object_key)
    if head is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Upload not found in storage")
    size = head["size"] or data.size
    width, height = data.width, data.height
    if (not width or not height) and data.mime_type != "image/svg+xml":
        blob = sb.download(data.object_key, min(size, settings().max_upload_bytes))
        if blob:
            try:
                from io import BytesIO

                from PIL import Image

                with Image.open(BytesIO(blob)) as img:
                    width, height = img.size
            except Exception:  # noqa: BLE001 — dimensions are advisory
                pass
    fields = dict(kind="image", url=sb.public_url(data.object_key), object_key=data.object_key, file_name=data.file_name[:255], mime_type=data.mime_type, size=size, width=width, height=height, alt=data.alt, caption=data.caption, credit=data.credit, photographer=data.photographer, focal_x=data.focal_x, focal_y=data.focal_y, category=data.category, tags=data.tags)
    if data.replace_id:
        asset = _get_or_404(db, m.MediaAsset, data.replace_id, "Media asset")
        for k, v in fields.items():
            setattr(asset, k, v)
        action = "replace"
    else:
        asset = m.MediaAsset(**fields)
        db.add(asset)
        action = "upload"
    audit(db, who, action, "media", asset.id, data.file_name)
    db.commit()
    db.refresh(asset)
    return MediaAssetOut.model_validate(asset)


@router.put("/media/{media_id}", response_model=MediaAssetOut)
def update_media(media_id: uuid.UUID, data: MediaMetaIn, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> MediaAssetOut:
    asset = _get_or_404(db, m.MediaAsset, media_id, "Media asset")
    for k, v in data.model_dump().items():
        setattr(asset, k, v)
    audit(db, who, "update", "media", asset.id, asset.file_name)
    db.commit()
    db.refresh(asset)
    return MediaAssetOut.model_validate(asset)


@router.get("/media/{media_id}/usage")
def get_media_usage(media_id: uuid.UUID, db: Session = Depends(get_db)) -> list[dict]:
    _get_or_404(db, m.MediaAsset, media_id, "Media asset")
    return media_usage(db, media_id)


@router.delete("/media/{media_id}", status_code=204)
def delete_media(media_id: uuid.UUID, force: bool = False, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> None:
    asset = _get_or_404(db, m.MediaAsset, media_id, "Media asset")
    uses = media_usage(db, media_id)
    if uses and not force:
        raise HTTPException(status.HTTP_409_CONFLICT, {"message": "Asset is in use", "usage": uses})
    if asset.object_key and supabase().enabled:
        supabase().delete_object(asset.object_key)
    audit(db, who, "delete", "media", asset.id, asset.file_name)
    db.delete(asset)
    db.commit()


# ---------------------------------------------------------------- pages
@router.get("/pages", response_model=list[PageOut])
def list_pages(db: Session = Depends(get_db)) -> list[PageOut]:
    return [PageOut.model_validate(p) for p in db.scalars(select(m.Page).order_by(m.Page.slug)).unique()]


@router.post("/pages", response_model=PageOut, status_code=201)
def create_page(data: PageIn, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> PageOut:
    page = m.Page()
    apply_page(db, page, data)
    db.add(page)
    audit(db, who, "create", "page", page.id, data.slug)
    db.commit()
    db.refresh(page)
    return PageOut.model_validate(page)


@router.put("/pages/{page_id}", response_model=PageOut)
def update_page(page_id: uuid.UUID, data: PageIn, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> PageOut:
    page = _get_or_404(db, m.Page, page_id, "Page")
    apply_page(db, page, data)
    audit(db, who, "update", "page", page.id, data.slug)
    db.commit()
    db.refresh(page)
    return PageOut.model_validate(page)


@router.delete("/pages/{page_id}", status_code=204)
def delete_page(page_id: uuid.UUID, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> None:
    page = _get_or_404(db, m.Page, page_id, "Page")
    audit(db, who, "delete", "page", page.id, page.slug)
    db.delete(page)
    db.commit()


# ---------------------------------------------------------------- homepage curator
@router.get("/homepage", response_model=list[HomepageSectionOut])
def get_homepage_sections(db: Session = Depends(get_db)) -> list[HomepageSectionOut]:
    return [HomepageSectionOut.model_validate(s) for s in db.scalars(select(m.HomepageSection).order_by(m.HomepageSection.display_order)).unique()]


@router.put("/homepage", response_model=list[HomepageSectionOut])
def put_homepage_sections(data: list[HomepageSectionIn], db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> list[HomepageSectionOut]:
    existing = {s.kind: s for s in db.scalars(select(m.HomepageSection)).unique()}
    for order, incoming in enumerate(data):
        section = existing.get(incoming.kind)
        if section is None:
            section = m.HomepageSection(kind=incoming.kind)
            db.add(section)
        section.enabled = incoming.enabled
        section.display_order = order
        section.settings = incoming.settings
        section.items = [m.HomepageSectionItem(resource=i.resource, resource_id=i.resource_id, display_order=n) for n, i in enumerate(incoming.items)]
    audit(db, who, "update", "homepage", None, f"{len(data)} sections")
    db.commit()
    return get_homepage_sections(db)


# ---------------------------------------------------------------- navigation
@router.get("/navigation", response_model=list[NavigationItemOut])
def get_navigation(db: Session = Depends(get_db)) -> list[NavigationItemOut]:
    return [NavigationItemOut.model_validate(n) for n in db.scalars(select(m.NavigationItem).order_by(m.NavigationItem.group, m.NavigationItem.display_order))]


@router.put("/navigation", response_model=list[NavigationItemOut])
def put_navigation(data: list[NavigationItemIn], db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> list[NavigationItemOut]:
    keep: set[uuid.UUID] = set()
    for item in data:
        row = db.get(m.NavigationItem, item.id) if item.id else None
        if row is None:
            row = m.NavigationItem(id=item.id or uuid.uuid4())
            db.add(row)
        row.group, row.href, row.label, row.display_order, row.parent_id, row.external = item.group, item.href, item.label, item.display_order, item.parent_id, item.external
        keep.add(row.id)
    for row in list(db.scalars(select(m.NavigationItem))):
        if row.id not in keep:
            db.delete(row)
    audit(db, who, "update", "navigation", None, f"{len(data)} items")
    db.commit()
    return get_navigation(db)


# ---------------------------------------------------------------- venues
@router.get("/venues", response_model=list[VenueOut])
def list_venues(db: Session = Depends(get_db)) -> list[VenueOut]:
    return [VenueOut.model_validate(v) for v in db.scalars(select(m.Venue).order_by(m.Venue.created_at))]


@router.post("/venues", response_model=VenueOut, status_code=201)
def create_venue(data: VenueIn, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> VenueOut:
    ensure_unique_slug(db, m.Venue, data.slug, None)
    venue = m.Venue(**data.model_dump())
    db.add(venue)
    audit(db, who, "create", "venue", venue.id, data.slug)
    db.commit()
    return VenueOut.model_validate(venue)


@router.put("/venues/{venue_id}", response_model=VenueOut)
def update_venue(venue_id: uuid.UUID, data: VenueIn, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> VenueOut:
    venue = _get_or_404(db, m.Venue, venue_id, "Venue")
    ensure_unique_slug(db, m.Venue, data.slug, venue.id)
    for k, v in data.model_dump().items():
        setattr(venue, k, v)
    audit(db, who, "update", "venue", venue.id, data.slug)
    db.commit()
    return VenueOut.model_validate(venue)


# ---------------------------------------------------------------- settings (admin)
@router.get("/settings")
def get_settings(db: Session = Depends(get_db)) -> dict:
    return {r.key: r.value for r in db.scalars(select(m.SiteSetting))}


@router.put("/settings/{key}", dependencies=[Depends(require_admin)])
def put_setting(key: str, data: SettingIn, db: Session = Depends(get_db), who: Principal = Depends(require_admin)) -> dict:
    if key not in ("site", "locales", "seo", "contact"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unknown settings key")
    row = db.get(m.SiteSetting, key)
    if row is None:
        row = m.SiteSetting(key=key, value=data.value)
        db.add(row)
    else:
        row.value = data.value
    audit(db, who, "update", "settings", key)
    db.commit()
    return {key: row.value}


# ---------------------------------------------------------------- users & roles (admin)
@router.get("/users", response_model=list[ProfileOut], dependencies=[Depends(require_admin)])
def list_users(db: Session = Depends(get_db)) -> list[ProfileOut]:
    return [ProfileOut.model_validate(p) for p in db.scalars(select(m.Profile).order_by(m.Profile.created_at))]


@router.post("/users/invite", response_model=ProfileOut, status_code=201)
def invite_user(data: InviteIn, db: Session = Depends(get_db), who: Principal = Depends(require_admin)) -> ProfileOut:
    email = str(data.email).lower()
    if db.scalars(select(m.Profile).where(m.Profile.email == email)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "A staff profile with this email already exists")
    user = supabase().invite_user(email, data.role, data.display_name)
    profile = m.Profile(id=uuid.UUID(user["id"]), email=email, display_name=data.display_name or email.split("@")[0], role=data.role, active=True)
    db.add(profile)
    audit(db, who, "invite", "profile", profile.id, f"{email} as {data.role}")
    db.commit()
    return ProfileOut.model_validate(profile)


@router.put("/users/{user_id}", response_model=ProfileOut)
def update_user(user_id: uuid.UUID, data: ProfileUpdateIn, db: Session = Depends(get_db), who: Principal = Depends(require_admin)) -> ProfileOut:
    profile = _get_or_404(db, m.Profile, user_id, "Staff profile")
    if profile.id == who.id and (data.role == "editor" or data.active is False):
        raise HTTPException(status.HTTP_409_CONFLICT, "You cannot demote or deactivate your own account")
    if data.display_name is not None:
        profile.display_name = data.display_name
    if data.role is not None and data.role != profile.role:
        profile.role = data.role
        supabase().set_user_role(profile.id, data.role)
    if data.active is not None:
        profile.active = data.active
    audit(db, who, "update", "profile", profile.id, profile.email)
    db.commit()
    return ProfileOut.model_validate(profile)


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: uuid.UUID, db: Session = Depends(get_db), who: Principal = Depends(require_admin)) -> None:
    profile = _get_or_404(db, m.Profile, user_id, "Staff profile")
    if profile.id == who.id:
        raise HTTPException(status.HTTP_409_CONFLICT, "You cannot delete your own account")
    supabase().delete_user(profile.id)
    audit(db, who, "delete", "profile", profile.id, profile.email)
    db.delete(profile)
    db.commit()


# ---------------------------------------------------------------- audit & messages
@router.get("/audit", response_model=list[AuditOut])
def list_audit(limit: int = Query(default=50, le=200), db: Session = Depends(get_db)) -> list[AuditOut]:
    return [AuditOut.model_validate(a) for a in db.scalars(select(m.AuditEntry).order_by(m.AuditEntry.created_at.desc()).limit(limit))]


@router.get("/messages", response_model=list[ContactMessageOut])
def list_messages(db: Session = Depends(get_db), resolved: bool | None = None) -> list[ContactMessageOut]:
    stmt = select(m.ContactMessage).order_by(m.ContactMessage.created_at.desc())
    if resolved is not None:
        stmt = stmt.where(m.ContactMessage.resolved.is_(resolved))
    return [ContactMessageOut.model_validate(c) for c in db.scalars(stmt.limit(200))]


@router.post("/messages/{message_id}/resolve", response_model=ContactMessageOut)
def resolve_message(message_id: uuid.UUID, db: Session = Depends(get_db), who: Principal = Depends(require_staff)) -> ContactMessageOut:
    row = _get_or_404(db, m.ContactMessage, message_id, "Message")
    row.resolved = True
    audit(db, who, "resolve", "message", row.id)
    db.commit()
    return ContactMessageOut.model_validate(row)
