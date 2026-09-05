"""SQLAlchemy 2 models. Translations are normalized per locale; an event has many sessions."""

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base, TZDateTime, utcnow

JSONType = JSON().with_variant(JSONB(), "postgresql")


def new_id() -> uuid.UUID:
    return uuid.uuid4()


class Identified:
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=new_id)
    created_at: Mapped[datetime] = mapped_column(TZDateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TZDateTime, default=utcnow, onupdate=utcnow, nullable=False)


class Profile(Identified, Base):
    """Staff identity. `id` equals the Supabase auth user id (FK added on Postgres)."""

    __tablename__ = "profiles"
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    role: Mapped[str] = mapped_column(String(16), default="editor", nullable=False)  # admin | editor
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(TZDateTime, nullable=True)


class CategoryMixin:
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    labels: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class EventCategory(Identified, CategoryMixin, Base):
    __tablename__ = "event_categories"


class ArticleCategory(Identified, CategoryMixin, Base):
    __tablename__ = "article_categories"


class Venue(Identified, Base):
    __tablename__ = "venues"
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    name: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    address: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    directions: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    accessibility: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    hours: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    notes: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    map_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    phone: Mapped[str] = mapped_column(String(60), default="", nullable=False)
    email: Mapped[str] = mapped_column(String(254), default="", nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class MediaAsset(Identified, Base):
    __tablename__ = "media_assets"
    kind: Mapped[str] = mapped_column(String(16), default="image", nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    object_key: Mapped[str | None] = mapped_column(Text, nullable=True, unique=True)
    file_name: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    width: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    height: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    alt: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    caption: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    credit: Mapped[str] = mapped_column(String(240), default="", nullable=False)
    photographer: Mapped[str] = mapped_column(String(240), default="", nullable=False)
    focal_x: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    focal_y: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    category: Mapped[str] = mapped_column(String(40), default="photography", nullable=False, index=True)
    tags: Mapped[list] = mapped_column(JSONType, default=list, nullable=False)


class TranslationMixin:
    locale: Mapped[str] = mapped_column(String(5), nullable=False)
    title: Mapped[str] = mapped_column(String(240), default="", nullable=False)
    subtitle: Mapped[str] = mapped_column(String(400), default="", nullable=False)
    seo_title: Mapped[str] = mapped_column(String(240), default="", nullable=False)
    seo_description: Mapped[str] = mapped_column(String(400), default="", nullable=False)


class Video(Identified, Base):
    __tablename__ = "videos"
    youtube_id: Mapped[str | None] = mapped_column(String(11), nullable=True)
    poster_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media_assets.id", ondelete="SET NULL"), nullable=True)
    featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="draft", nullable=False, index=True)
    sample: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    poster: Mapped[MediaAsset | None] = relationship(lazy="joined")
    translations: Mapped[list["VideoTranslation"]] = relationship(cascade="all, delete-orphan", lazy="selectin")

    @property
    def translations_map(self) -> dict:
        return {t.locale: t for t in self.translations}


class VideoTranslation(Identified, Base):
    __tablename__ = "video_translations"
    __table_args__ = (UniqueConstraint("video_id", "locale"),)
    video_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    locale: Mapped[str] = mapped_column(String(5), nullable=False)
    title: Mapped[str] = mapped_column(String(240), default="", nullable=False)
    subtitle: Mapped[str] = mapped_column(String(400), default="", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)


class Event(Identified, Base):
    """One artistic production. Its performances live in event_sessions."""

    __tablename__ = "events"
    __table_args__ = (Index("ix_events_status_published_at", "status", "published_at"),)
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="draft", nullable=False, index=True)
    category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("event_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    venue_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("venues.id", ondelete="SET NULL"), nullable=True, index=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    poster_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media_assets.id", ondelete="SET NULL"), nullable=True)
    hero_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media_assets.id", ondelete="SET NULL"), nullable=True)
    video_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("videos.id", ondelete="SET NULL"), nullable=True)
    sample: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    credits: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(TZDateTime, nullable=True)

    category: Mapped[EventCategory | None] = relationship(lazy="joined")
    venue: Mapped[Venue | None] = relationship(lazy="joined")
    poster: Mapped[MediaAsset | None] = relationship(foreign_keys=[poster_id], lazy="joined")
    hero: Mapped[MediaAsset | None] = relationship(foreign_keys=[hero_id], lazy="joined")
    video: Mapped[Video | None] = relationship(lazy="selectin")
    translations: Mapped[list["EventTranslation"]] = relationship(cascade="all, delete-orphan", lazy="selectin")
    sessions: Mapped[list["EventSession"]] = relationship(cascade="all, delete-orphan", lazy="selectin", order_by="EventSession.starts_at")
    gallery_items: Mapped[list["EventGalleryItem"]] = relationship(cascade="all, delete-orphan", lazy="selectin", order_by="EventGalleryItem.display_order")

    @property
    def translations_map(self) -> dict:
        return {t.locale: t for t in self.translations}

    @property
    def gallery(self) -> list[MediaAsset]:
        return [i.media for i in self.gallery_items if i.media is not None]


class EventTranslation(Identified, TranslationMixin, Base):
    __tablename__ = "event_translations"
    __table_args__ = (UniqueConstraint("event_id", "locale"),)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    excerpt: Mapped[str] = mapped_column(Text, default="", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    audience: Mapped[str] = mapped_column(String(240), default="", nullable=False)


class EventGalleryItem(Identified, Base):
    __tablename__ = "event_gallery_items"
    __table_args__ = (UniqueConstraint("event_id", "media_id"),)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    media_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    media: Mapped[MediaAsset] = relationship(lazy="joined")


class EventSession(Identified, Base):
    """One scheduled performance of an event."""

    __tablename__ = "event_sessions"
    __table_args__ = (Index("ix_event_sessions_status_starts_at", "status", "starts_at"),)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    starts_at: Mapped[datetime] = mapped_column(TZDateTime, nullable=False, index=True)
    ends_at: Mapped[datetime | None] = mapped_column(TZDateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="scheduled", nullable=False)  # scheduled | sold_out | cancelled
    ticket: Mapped["TicketLink | None"] = relationship(cascade="all, delete-orphan", uselist=False, lazy="selectin")
    event: Mapped[Event] = relationship(viewonly=True, lazy="selectin")


class TicketLink(Identified, Base):
    __tablename__ = "event_ticket_links"
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("event_sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(100), default="Tickets", nullable=False)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[str | None] = mapped_column(String(40), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(8), nullable=True)
    note: Mapped[str] = mapped_column(String(240), default="", nullable=False)


class Article(Identified, Base):
    __tablename__ = "articles"
    __table_args__ = (Index("ix_articles_status_published_at", "status", "published_at"),)
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="draft", nullable=False, index=True)
    category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("article_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    lead_image_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("media_assets.id", ondelete="SET NULL"), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(TZDateTime, nullable=True)
    sample: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reading_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    category: Mapped[ArticleCategory | None] = relationship(lazy="joined")
    lead_image: Mapped[MediaAsset | None] = relationship(lazy="joined")
    translations: Mapped[list["ArticleTranslation"]] = relationship(cascade="all, delete-orphan", lazy="selectin")

    @property
    def translations_map(self) -> dict:
        return {t.locale: t for t in self.translations}


class ArticleTranslation(Identified, TranslationMixin, Base):
    __tablename__ = "article_translations"
    __table_args__ = (UniqueConstraint("article_id", "locale"),)
    article_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"), nullable=False, index=True)
    excerpt: Mapped[str] = mapped_column(Text, default="", nullable=False)
    body: Mapped[str] = mapped_column(Text, default="", nullable=False)


class Gallery(Identified, Base):
    __tablename__ = "galleries"
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="draft", nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(40), default="photography", nullable=False)
    sample: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    translations: Mapped[list["GalleryTranslation"]] = relationship(cascade="all, delete-orphan", lazy="selectin")
    items: Mapped[list["GalleryItem"]] = relationship(cascade="all, delete-orphan", lazy="selectin", order_by="GalleryItem.display_order")

    @property
    def translations_map(self) -> dict:
        return {t.locale: t for t in self.translations}


class GalleryTranslation(Identified, Base):
    __tablename__ = "gallery_translations"
    __table_args__ = (UniqueConstraint("gallery_id", "locale"),)
    gallery_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("galleries.id", ondelete="CASCADE"), nullable=False, index=True)
    locale: Mapped[str] = mapped_column(String(5), nullable=False)
    title: Mapped[str] = mapped_column(String(240), default="", nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)


class GalleryItem(Identified, Base):
    __tablename__ = "gallery_items"
    gallery_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("galleries.id", ondelete="CASCADE"), nullable=False, index=True)
    media_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("media_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    caption: Mapped[dict | None] = mapped_column(JSONType, nullable=True)
    media: Mapped[MediaAsset] = relationship(lazy="joined")


class Page(Identified, Base):
    __tablename__ = "pages"
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="draft", nullable=False)
    settings: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    translations: Mapped[list["PageTranslation"]] = relationship(cascade="all, delete-orphan", lazy="selectin")

    @property
    def translations_map(self) -> dict:
        return {t.locale: t for t in self.translations}


class PageTranslation(Identified, TranslationMixin, Base):
    __tablename__ = "page_translations"
    __table_args__ = (UniqueConstraint("page_id", "locale"),)
    page_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pages.id", ondelete="CASCADE"), nullable=False, index=True)
    body: Mapped[str] = mapped_column(Text, default="", nullable=False)


class HomepageSection(Identified, Base):
    __tablename__ = "homepage_sections"
    kind: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    settings: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    items: Mapped[list["HomepageSectionItem"]] = relationship(cascade="all, delete-orphan", lazy="selectin", order_by="HomepageSectionItem.display_order")


class HomepageSectionItem(Identified, Base):
    __tablename__ = "homepage_section_items"
    section_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("homepage_sections.id", ondelete="CASCADE"), nullable=False, index=True)
    resource: Mapped[str] = mapped_column(String(32), nullable=False)  # event | article | video | media | gallery
    resource_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class NavigationItem(Identified, Base):
    __tablename__ = "navigation_items"
    group: Mapped[str] = mapped_column(String(32), default="header", nullable=False, index=True)
    href: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("navigation_items.id", ondelete="SET NULL"), nullable=True)
    external: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class SiteSetting(Base):
    __tablename__ = "site_settings"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TZDateTime, default=utcnow, onupdate=utcnow, nullable=False)


class AuditEntry(Base):
    __tablename__ = "audit_entries"
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=new_id)
    created_at: Mapped[datetime] = mapped_column(TZDateTime, default=utcnow, nullable=False, index=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True, index=True)
    actor_email: Mapped[str] = mapped_column(String(254), default="", nullable=False)
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    resource: Mapped[str] = mapped_column(String(80), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    summary: Mapped[str] = mapped_column(String(400), default="", nullable=False)


class ContactMessage(Base):
    __tablename__ = "contact_messages"
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=new_id)
    created_at: Mapped[datetime] = mapped_column(TZDateTime, default=utcnow, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    locale: Mapped[str] = mapped_column(String(5), default="mn", nullable=False)
    ip_hash: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class RateLimitBucket(Base):
    __tablename__ = "rate_limit_buckets"
    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(TZDateTime, nullable=False, index=True)
