from app.security import parse_youtube_id, sanitize_html


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["database"].startswith("ok")
    assert body["supabase"] == "unconfigured"


def test_homepage_shape(client):
    r = client.get("/api/v1/homepage")
    assert r.status_code == 200
    home = r.json()
    for key in ("sections", "hero", "next_on_stage", "featured", "whats_on", "video", "in_motion", "stories", "about", "visit", "categories"):
        assert key in home
    assert len(home["hero"]["events"]) == 6
    assert home["hero"]["events"][0]["translations"]["mn"]["title"]
    # next on stage lists distinct productions, earliest first
    ids = [p["event"]["id"] for p in home["next_on_stage"]]
    assert len(ids) == len(set(ids))
    starts = [p["session"]["starts_at"] for p in home["next_on_stage"]]
    assert starts == sorted(starts)
    assert home["visit"]["verified"] is False


def test_events_and_sessions(client):
    r = client.get("/api/v1/events", params={"range": "all"})
    assert r.status_code == 200
    events = r.json()
    assert len(events) == 6
    ring = next(e for e in events if e["slug"] == "the-ring")
    assert len(ring["sessions"]) == 5
    assert ring["sessions"][1]["status"] == "sold_out"
    assert ring["sessions"][0]["starts_at"].endswith("+00:00")
    assert ring["category"]["slug"] == "contemporary"
    assert ring["poster"]["url"].startswith("/placeholders/")
    assert len(ring["gallery"]) == 3


def test_event_filters(client):
    week = client.get("/api/v1/events", params={"range": "week"}).json()
    past = client.get("/api/v1/events", params={"range": "past"}).json()
    family = client.get("/api/v1/events", params={"category": "family"}).json()
    by_date = client.get("/api/v1/events", params={"date": "2026-09-12"}).json()
    by_month = client.get("/api/v1/events", params={"month": "2026-10"}).json()
    assert {e["slug"] for e in family} == {"red-thread"}
    assert {e["slug"] for e in by_date} == {"the-ring"}
    assert {e["slug"] for e in by_month} >= {"interlude", "balance"}
    assert all(len(e["sessions"]) for e in week + past)
    assert client.get("/api/v1/events", params={"month": "2026-13"}).status_code == 422
    assert client.get("/api/v1/events", params={"range": "bogus"}).status_code == 422


def test_event_detail_and_404(client):
    assert client.get("/api/v1/events/the-ring").status_code == 200
    assert client.get("/api/v1/events/does-not-exist").status_code == 404


def test_calendar(client):
    r = client.get("/api/v1/calendar", params={"month": "2026-09"})
    assert r.status_code == 200
    rows = r.json()
    assert rows and all(p["session"]["starts_at"].startswith("2026-09") for p in rows)
    assert client.get("/api/v1/calendar", params={"month": "bad"}).status_code == 422


def test_articles_videos_galleries_pages(client):
    assert len(client.get("/api/v1/articles").json()) == 5
    assert client.get("/api/v1/articles/the-space-between").json()["translations"]["en"]["body"].startswith("<p")
    assert client.get("/api/v1/articles/nope").status_code == 404
    videos = client.get("/api/v1/videos").json()
    assert len(videos) == 3 and videos[0]["poster"]["url"]
    galleries = client.get("/api/v1/galleries").json()
    assert len(galleries) == 4 and galleries[0]["items"][0]["media"]["url"]
    assert client.get("/api/v1/pages/about").json()["slug"] == "about"
    assert client.get("/api/v1/pages/missing").status_code == 404
    cats = client.get("/api/v1/categories").json()
    assert {c["kind"] for c in cats} == {"event", "article"}
    nav = client.get("/api/v1/navigation").json()
    assert any(n["group"] == "header" for n in nav)
    settings = client.get("/api/v1/settings").json()
    assert settings["site"]["name"] == "UB CIRCUS"


def test_contact_validation_and_rate_limit(client):
    bad = client.post("/api/v1/contact", json={"name": "A", "email": "not-an-email", "category": "general", "message": "short"})
    assert bad.status_code == 422
    honeypot = client.post("/api/v1/contact", json={"name": "Bot", "email": "bot@example.com", "category": "general", "message": "x" * 20, "website": "http://spam"})
    assert honeypot.status_code == 202
    payload = {"name": "Visitor", "email": "visitor@example.com", "category": "tickets", "message": "I would like to know about group bookings."}
    codes = [client.post("/api/v1/contact", json=payload, headers={"x-forwarded-for": "203.0.113.7"}).status_code for _ in range(6)]
    assert codes[:5] == [202] * 5
    assert codes[5] == 429


def test_youtube_parser():
    assert parse_youtube_id("https://youtu.be/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert parse_youtube_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1s") == "dQw4w9WgXcQ"
    assert parse_youtube_id("https://www.youtube.com/embed/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert parse_youtube_id("https://youtube.com/shorts/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert parse_youtube_id("dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert parse_youtube_id("https://vimeo.com/123") is None
    assert parse_youtube_id("javascript:alert(1)") is None


def test_sanitizer_strips_scripts():
    dirty = '<p onclick="x">Hi<script>alert(1)</script></p><a href="javascript:evil()">x</a><figure data-media="abc"><figcaption>c</figcaption></figure>'
    clean = sanitize_html(dirty)
    assert "<script" not in clean and "onclick" not in clean and "javascript:" not in clean
    assert 'data-media="abc"' in clean
