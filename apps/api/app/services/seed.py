"""Idempotent loader for the labelled sample content (app/seed/content.json)."""

import json
import uuid
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from .. import models as m

SEED_PATH = Path(__file__).resolve().parent.parent / "seed" / "content.json"


def _dt(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None


def _uuid(value: str | None) -> uuid.UUID | None:
    return uuid.UUID(value) if value else None


def _upsert(db: Session, model, id_: uuid.UUID, **fields):
    row = db.get(model, id_)
    if row is None:
        row = model(id=id_, **fields)
        db.add(row)
    else:
        for k, v in fields.items():
            setattr(row, k, v)
    return row


def seed(db: Session, path: Path = SEED_PATH) -> dict[str, int]:
    doc = json.loads(path.read_text(encoding="utf-8"))
    counts: dict[str, int] = {}

    for a in doc["media"]:
        _upsert(db, m.MediaAsset, uuid.UUID(a["id"]), kind=a["kind"], url=a["url"], object_key=a.get("object_key"), file_name=a["file_name"], mime_type=a["mime_type"], size=a["size"], width=a["width"], height=a["height"], alt=a["alt"], caption=a.get("caption"), credit=a["credit"], photographer=a["photographer"], focal_x=a["focal_x"], focal_y=a["focal_y"], category=a["category"], tags=a["tags"])
    counts["media"] = len(doc["media"])
    db.flush()

    for c in doc["event_categories"]:
        _upsert(db, m.EventCategory, uuid.UUID(c["id"]), slug=c["slug"], labels=c["labels"], display_order=c["display_order"])
    for c in doc["article_categories"]:
        _upsert(db, m.ArticleCategory, uuid.UUID(c["id"]), slug=c["slug"], labels=c["labels"], display_order=c["display_order"])
    for v in doc["venues"]:
        _upsert(db, m.Venue, uuid.UUID(v["id"]), slug=v["slug"], name=v["name"], address=v["address"], directions=v["directions"], accessibility=v["accessibility"], hours=v["hours"], notes=v["notes"], map_url=v.get("map_url"), latitude=v.get("latitude"), longitude=v.get("longitude"), phone=v["phone"], email=v["email"], verified=v["verified"])
    db.flush()

    for v in doc["videos"]:
        video = _upsert(db, m.Video, uuid.UUID(v["id"]), youtube_id=v.get("youtube_id"), poster_id=_uuid(v.get("poster_id")), featured=v["featured"], display_order=v["display_order"], status=v["status"], sample=v.get("sample", True))
        video.translations = [m.VideoTranslation(locale=loc, **t) for loc, t in v["translations"].items()]
    counts["videos"] = len(doc["videos"])
    db.flush()

    for e in doc["events"]:
        event = _upsert(db, m.Event, uuid.UUID(e["id"]), slug=e["slug"], status=e["status"], category_id=_uuid(e.get("category_id")), venue_id=_uuid(e.get("venue_id")), duration_minutes=e.get("duration_minutes"), poster_id=_uuid(e.get("poster_id")), hero_id=_uuid(e.get("hero_id")), video_id=_uuid(e.get("video_id")), sample=e.get("sample", True), credits=e.get("credits", {}), published_at=_dt(e.get("published_at")))
        event.translations = [m.EventTranslation(locale=loc, **t) for loc, t in e["translations"].items()]
        event.gallery_items = [m.EventGalleryItem(media_id=uuid.UUID(mid), display_order=i) for i, mid in enumerate(e.get("gallery_ids", []))]
        sessions = []
        for s in e["sessions"]:
            session = m.EventSession(id=uuid.UUID(s["id"]), starts_at=_dt(s["starts_at"]), ends_at=_dt(s.get("ends_at")), status=s["status"])
            if s.get("ticket"):
                t = s["ticket"]
                session.ticket = m.TicketLink(id=uuid.UUID(t["id"]), label=t["label"], url=t.get("url"), price=t.get("price"), currency=t.get("currency"), note=t.get("note", ""))
            sessions.append(session)
        event.sessions = sessions
    counts["events"] = len(doc["events"])
    db.flush()

    for g in doc["galleries"]:
        gallery = _upsert(db, m.Gallery, uuid.UUID(g["id"]), slug=g["slug"], status=g["status"], category=g["category"], sample=g.get("sample", True))
        gallery.translations = [m.GalleryTranslation(locale=loc, **t) for loc, t in g["translations"].items()]
        gallery.items = [m.GalleryItem(id=uuid.UUID(i["id"]), media_id=uuid.UUID(i["media_id"]), display_order=i["display_order"], caption=i.get("caption")) for i in g["items"]]
    counts["galleries"] = len(doc["galleries"])

    for a in doc["articles"]:
        article = _upsert(db, m.Article, uuid.UUID(a["id"]), slug=a["slug"], status=a["status"], category_id=_uuid(a.get("category_id")), lead_image_id=_uuid(a.get("lead_image_id")), published_at=_dt(a.get("published_at")), sample=a.get("sample", True), reading_minutes=a.get("reading_minutes"))
        article.translations = [m.ArticleTranslation(locale=loc, **t) for loc, t in a["translations"].items()]
    counts["articles"] = len(doc["articles"])

    for p in doc["pages"]:
        page = _upsert(db, m.Page, uuid.UUID(p["id"]), slug=p["slug"], status=p["status"], settings=p.get("settings", {}))
        page.translations = [m.PageTranslation(locale=loc, **t) for loc, t in p["translations"].items()]
    counts["pages"] = len(doc["pages"])

    for s in doc["homepage_sections"]:
        section = _upsert(db, m.HomepageSection, uuid.UUID(s["id"]), kind=s["kind"], enabled=s["enabled"], display_order=s["display_order"], settings=s.get("settings", {}))
        section.items = [m.HomepageSectionItem(id=uuid.UUID(i["id"]), resource=i["resource"], resource_id=uuid.UUID(i["resource_id"]), display_order=i["display_order"]) for i in s.get("items", [])]
    counts["homepage_sections"] = len(doc["homepage_sections"])

    for n in doc["navigation_items"]:
        _upsert(db, m.NavigationItem, uuid.UUID(n["id"]), group=n["group"], href=n["href"], label=n["label"], display_order=n["display_order"], parent_id=_uuid(n.get("parent_id")), external=n.get("external", False))
    counts["navigation_items"] = len(doc["navigation_items"])

    for s in doc["site_settings"]:
        row = db.get(m.SiteSetting, s["key"])
        if row is None:
            db.add(m.SiteSetting(key=s["key"], value=s["value"]))
        else:
            row.value = s["value"]
    counts["site_settings"] = len(doc["site_settings"])

    db.commit()
    return counts


if __name__ == "__main__":  # python -m app.services.seed
    from ..db import SessionLocal

    with SessionLocal() as session:
        print(seed(session))
