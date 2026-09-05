"""Pydantic v2 schemas. Public *Out models mirror apps/web/lib/content/types.ts exactly."""

import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer, field_validator

Locale = Literal["mn", "en", "tr"]
Tr = dict[str, str]
PublishStatus = Literal["draft", "scheduled", "published", "cancelled", "archived"]
SessionStatus = Literal["scheduled", "sold_out", "cancelled"]
MediaCategory = Literal["photography", "performances", "behind-the-scenes", "posters", "videos"]


class Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("*", when_used="json")
    def _serialise(self, value: Any):
        if isinstance(value, datetime):
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            return value.isoformat()
        return value


class Stamped(Out):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class MediaAssetOut(Stamped):
    kind: str
    url: str
    object_key: str | None
    file_name: str
    mime_type: str
    size: int
    width: int
    height: int
    alt: Tr
    caption: Tr | None
    credit: str
    photographer: str
    focal_x: float
    focal_y: float
    category: str
    tags: list[str]


class CategoryOut(Out):
    id: uuid.UUID
    slug: str
    labels: Tr
    display_order: int
    kind: Literal["event", "article"] = "event"


class VenueOut(Stamped):
    slug: str
    name: Tr
    address: Tr
    directions: Tr
    accessibility: Tr
    hours: Tr
    notes: Tr
    map_url: str | None
    latitude: float | None
    longitude: float | None
    phone: str
    email: str
    verified: bool


class TicketLinkOut(Out):
    id: uuid.UUID
    label: str
    url: str | None
    price: str | None
    currency: str | None
    note: str


class SessionOut(Out):
    id: uuid.UUID
    starts_at: datetime
    ends_at: datetime | None
    status: SessionStatus
    ticket: TicketLinkOut | None


class EventTranslationOut(Out):
    title: str
    subtitle: str
    excerpt: str
    description: str
    audience: str
    seo_title: str
    seo_description: str


class VideoTranslationOut(Out):
    title: str
    subtitle: str
    description: str


class VideoOut(Stamped):
    youtube_id: str | None
    poster: MediaAssetOut | None
    featured: bool
    display_order: int
    status: PublishStatus
    sample: bool
    translations: dict[str, VideoTranslationOut] = Field(validation_alias="translations_map")


class EventOut(Stamped):
    slug: str
    status: PublishStatus
    category: CategoryOut | None
    venue: VenueOut | None
    duration_minutes: int | None
    poster: MediaAssetOut | None
    hero: MediaAssetOut | None
    video: VideoOut | None
    gallery: list[MediaAssetOut]
    sample: bool
    published_at: datetime | None
    credits: Tr
    translations: dict[str, EventTranslationOut] = Field(validation_alias="translations_map")
    sessions: list[SessionOut]


class PerformanceOut(BaseModel):
    session: SessionOut
    event: EventOut


class ArticleTranslationOut(Out):
    title: str
    subtitle: str
    excerpt: str
    body: str
    seo_title: str
    seo_description: str


class ArticleOut(Stamped):
    slug: str
    status: PublishStatus
    category: CategoryOut | None
    lead_image: MediaAssetOut | None
    published_at: datetime | None
    sample: bool
    reading_minutes: int | None
    translations: dict[str, ArticleTranslationOut] = Field(validation_alias="translations_map")


class GalleryTranslationOut(Out):
    title: str
    description: str


class GalleryItemOut(Out):
    id: uuid.UUID
    media: MediaAssetOut
    display_order: int
    caption: Tr | None


class GalleryOut(Stamped):
    slug: str
    status: PublishStatus
    category: str
    sample: bool
    translations: dict[str, GalleryTranslationOut] = Field(validation_alias="translations_map")
    items: list[GalleryItemOut]


class PageTranslationOut(Out):
    title: str
    subtitle: str
    body: str
    seo_title: str
    seo_description: str


class PageOut(Stamped):
    slug: str
    status: PublishStatus
    settings: dict[str, Any]
    translations: dict[str, PageTranslationOut] = Field(validation_alias="translations_map")


class HomepageSectionItemOut(Out):
    id: uuid.UUID
    resource: str
    resource_id: uuid.UUID
    display_order: int


class HomepageSectionOut(Out):
    id: uuid.UUID
    kind: str
    enabled: bool
    display_order: int
    settings: dict[str, Any]
    items: list[HomepageSectionItemOut]


class NavigationItemOut(Out):
    id: uuid.UUID
    group: str
    href: str
    label: Tr
    display_order: int
    parent_id: uuid.UUID | None
    external: bool


class SectionFlag(BaseModel):
    kind: str
    enabled: bool


class AboutFeatureOut(BaseModel):
    year_label: str
    year_caption: Tr
    title: Tr
    body: Tr
    image: MediaAssetOut | None
    href: str


class HeroOut(BaseModel):
    caption: Tr
    events: list[EventOut]


class HomepageOut(BaseModel):
    sections: list[SectionFlag]
    hero: HeroOut
    next_on_stage: list[PerformanceOut]
    featured: list[EventOut]
    whats_on: list[EventOut]
    video: VideoOut | None
    in_motion: list[MediaAssetOut]
    stories: list[ArticleOut]
    about: AboutFeatureOut | None
    visit: VenueOut | None
    categories: list[CategoryOut]


class SiteSettingsOut(BaseModel):
    site: dict[str, Any]
    locales: dict[str, Any]
    seo: dict[str, Any]
    contact: dict[str, Any]


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    email: EmailStr
    category: str = Field(min_length=1, max_length=40)
    message: str = Field(min_length=10, max_length=4000)
    locale: Locale = "mn"
    website: str = ""  # honeypot


class HealthOut(BaseModel):
    status: str
    environment: str
    database: str
    supabase: str
    storage: str
    version: str


# ---------------------------------------------------------------- admin input schemas


class TranslationIn(BaseModel):
    title: str = ""
    subtitle: str = ""
    excerpt: str = ""
    description: str = ""
    audience: str = ""
    seo_title: str = ""
    seo_description: str = ""


class TicketIn(BaseModel):
    label: str = "Tickets"
    url: str | None = None
    price: str | None = None
    currency: str | None = None
    note: str = ""

    @field_validator("url")
    @classmethod
    def _https(cls, value: str | None) -> str | None:
        if value in (None, ""):
            return None
        if not value.startswith("https://"):
            raise ValueError("ticket links must use https://")
        return value


class SessionIn(BaseModel):
    id: uuid.UUID | None = None
    starts_at: datetime
    ends_at: datetime | None = None
    status: SessionStatus = "scheduled"
    ticket: TicketIn | None = None


class EventIn(BaseModel):
    slug: str = Field(min_length=1, max_length=160, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    status: PublishStatus = "draft"
    category_id: uuid.UUID | None = None
    venue_id: uuid.UUID | None = None
    duration_minutes: int | None = Field(default=None, ge=0, le=600)
    poster_id: uuid.UUID | None = None
    hero_id: uuid.UUID | None = None
    video_id: uuid.UUID | None = None
    gallery_ids: list[uuid.UUID] = []
    sample: bool = False
    credits: Tr = {}
    published_at: datetime | None = None
    translations: dict[str, TranslationIn] = {}
    sessions: list[SessionIn] = []


class ArticleTranslationIn(BaseModel):
    title: str = ""
    subtitle: str = ""
    excerpt: str = ""
    body: str = ""
    seo_title: str = ""
    seo_description: str = ""


class ArticleIn(BaseModel):
    slug: str = Field(min_length=1, max_length=160, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    status: PublishStatus = "draft"
    category_id: uuid.UUID | None = None
    lead_image_id: uuid.UUID | None = None
    published_at: datetime | None = None
    sample: bool = False
    reading_minutes: int | None = Field(default=None, ge=0, le=180)
    translations: dict[str, ArticleTranslationIn] = {}


class VideoTranslationIn(BaseModel):
    title: str = ""
    subtitle: str = ""
    description: str = ""


class VideoIn(BaseModel):
    youtube_url: str | None = None  # any YouTube URL variant or bare id; validated server-side
    poster_id: uuid.UUID | None = None
    featured: bool = False
    display_order: int = 0
    status: PublishStatus = "draft"
    sample: bool = False
    translations: dict[str, VideoTranslationIn] = {}


class GalleryItemIn(BaseModel):
    media_id: uuid.UUID
    caption: Tr | None = None


class GalleryTranslationIn(BaseModel):
    title: str = ""
    description: str = ""


class GalleryIn(BaseModel):
    slug: str = Field(min_length=1, max_length=160, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    status: PublishStatus = "draft"
    category: MediaCategory = "photography"
    sample: bool = False
    translations: dict[str, GalleryTranslationIn] = {}
    items: list[GalleryItemIn] = []


class PageTranslationIn(BaseModel):
    title: str = ""
    subtitle: str = ""
    body: str = ""
    seo_title: str = ""
    seo_description: str = ""


class PageIn(BaseModel):
    slug: str = Field(min_length=1, max_length=160, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    status: PublishStatus = "draft"
    settings: dict[str, Any] = {}
    translations: dict[str, PageTranslationIn] = {}


class CategoryIn(BaseModel):
    slug: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    labels: Tr = {}
    display_order: int = 0


class VenueIn(BaseModel):
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name: Tr = {}
    address: Tr = {}
    directions: Tr = {}
    accessibility: Tr = {}
    hours: Tr = {}
    notes: Tr = {}
    map_url: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    phone: str = ""
    email: str = ""
    verified: bool = False


class MediaMetaIn(BaseModel):
    alt: Tr = {}
    caption: Tr | None = None
    credit: str = ""
    photographer: str = ""
    focal_x: float = Field(default=0.5, ge=0, le=1)
    focal_y: float = Field(default=0.5, ge=0, le=1)
    category: MediaCategory = "photography"
    tags: list[str] = []


class UploadRequestIn(BaseModel):
    file_name: str = Field(min_length=1, max_length=255)
    mime_type: str
    size: int = Field(gt=0)
    replace_id: uuid.UUID | None = None


class UploadTicketOut(BaseModel):
    upload_url: str
    token: str | None
    object_key: str
    public_url: str
    method: str = "PUT"
    headers: dict[str, str] = {}


class FinalizeUploadIn(MediaMetaIn):
    object_key: str
    file_name: str
    mime_type: str
    size: int
    width: int = 0
    height: int = 0
    replace_id: uuid.UUID | None = None


class HomepageSectionItemIn(BaseModel):
    resource: Literal["event", "article", "video", "media", "gallery"]
    resource_id: uuid.UUID


class HomepageSectionIn(BaseModel):
    kind: str
    enabled: bool = True
    display_order: int = 0
    settings: dict[str, Any] = {}
    items: list[HomepageSectionItemIn] = []


class NavigationItemIn(BaseModel):
    id: uuid.UUID | None = None
    group: Literal["header", "footer"] = "header"
    href: str = Field(min_length=1, max_length=500)
    label: Tr = {}
    display_order: int = 0
    parent_id: uuid.UUID | None = None
    external: bool = False


class SettingIn(BaseModel):
    value: dict[str, Any]


class ProfileOut(Stamped):
    email: str
    display_name: str
    role: Literal["admin", "editor"]
    active: bool
    last_seen_at: datetime | None


class InviteIn(BaseModel):
    email: EmailStr
    display_name: str = ""
    role: Literal["admin", "editor"] = "editor"


class ProfileUpdateIn(BaseModel):
    display_name: str | None = None
    role: Literal["admin", "editor"] | None = None
    active: bool | None = None


class AuditOut(Out):
    id: uuid.UUID
    created_at: datetime
    actor_id: uuid.UUID | None
    actor_email: str
    action: str
    resource: str
    resource_id: str
    summary: str


class ContactMessageOut(Out):
    id: uuid.UUID
    created_at: datetime
    name: str
    email: str
    category: str
    message: str
    locale: str
    resolved: bool


class DashboardOut(BaseModel):
    now: datetime
    next_performance: PerformanceOut | None
    next_7_days: int
    next_30_days: int
    upcoming_sessions: list[PerformanceOut]
    published_events: int
    draft_events: int
    draft_stories: int
    published_stories: int
    video_count: int
    videos_without_id: int
    sessions_without_tickets: int
    recent_media: list[MediaAssetOut]
    recent_edits: list[AuditOut]
    unresolved_messages: int
