"""Input hardening: rich-text sanitising, YouTube id parsing, slugs, hashing."""

import hashlib
import re
from urllib.parse import parse_qs, urlparse

import bleach

ALLOWED_TAGS = ["p", "br", "strong", "em", "b", "i", "u", "a", "h2", "h3", "h4", "blockquote", "cite", "ul", "ol", "li", "figure", "figcaption", "img", "span", "hr"]
ALLOWED_ATTRS = {
    "a": ["href", "title", "rel", "target"],
    "img": ["src", "alt", "width", "height", "loading"],
    "figure": ["data-media"],
    "p": ["class"],
    "span": ["class"],
}
ALLOWED_PROTOCOLS = ["http", "https", "mailto"]
_YT_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


def _rel(attrs, new=False):
    href = attrs.get((None, "href"), "")
    if href.startswith("http"):
        attrs[(None, "rel")] = "noopener noreferrer"
        attrs[(None, "target")] = "_blank"
    return attrs


def sanitize_html(html: str | None) -> str:
    if not html:
        return ""
    cleaned = bleach.clean(html, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS, protocols=ALLOWED_PROTOCOLS, strip=True)
    return bleach.linkify(cleaned, callbacks=[_rel], skip_tags=["figure", "img"]) if "<a" in cleaned else cleaned


def parse_youtube_id(value: str | None) -> str | None:
    """Accept youtu.be, watch?v=, embed, shorts, live URLs or a bare id."""
    if not value:
        return None
    value = value.strip()
    if _YT_ID.match(value):
        return value
    try:
        url = urlparse(value)
    except ValueError:
        return None
    host = (url.hostname or "").lower().removeprefix("www.").removeprefix("m.")
    if host == "youtu.be":
        candidate = url.path.lstrip("/").split("/")[0]
        return candidate if _YT_ID.match(candidate) else None
    if host in ("youtube.com", "youtube-nocookie.com"):
        if url.path == "/watch":
            candidate = parse_qs(url.query).get("v", [""])[0]
            return candidate if _YT_ID.match(candidate) else None
        m = re.match(r"^/(?:embed|shorts|v|live)/([A-Za-z0-9_-]{11})", url.path)
        if m:
            return m.group(1)
    return None


def slugify(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value[:160] or "item"


def hash_ip(ip: str, salt: str = "ubcircus") -> str:
    return hashlib.sha256(f"{salt}:{ip}".encode()).hexdigest()[:32]
