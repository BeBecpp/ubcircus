import uuid


def test_admin_requires_token(client):
    assert client.get("/api/v1/admin/me").status_code == 401
    assert client.get("/api/v1/admin/me", headers={"Authorization": "Bearer nope"}).status_code in (401, 503)


def test_me_and_dashboard(client, auth):
    me = client.get("/api/v1/admin/me", headers=auth)
    assert me.status_code == 200 and me.json()["role"] == "admin"
    dash = client.get("/api/v1/admin/dashboard", headers=auth).json()
    assert dash["published_events"] == 6
    assert dash["next_performance"]["event"]["slug"]
    assert dash["next_7_days"] <= dash["next_30_days"]
    assert isinstance(dash["recent_media"], list)


def test_event_crud_with_sessions(client, auth):
    payload = {
        "slug": "test-production",
        "status": "draft",
        "translations": {"mn": {"title": "Тест", "description": "<p>Сайн<script>x</script></p>"}, "en": {"title": "Test"}},
        "sessions": [
            {"starts_at": "2026-12-01T19:00:00+08:00", "status": "scheduled", "ticket": {"label": "Tickets", "url": "https://example.com/t"}},
            {"starts_at": "2026-12-02T15:00:00+08:00", "status": "sold_out"},
        ],
        "gallery_ids": [],
    }
    created = client.post("/api/v1/admin/events", json=payload, headers=auth)
    assert created.status_code == 201, created.text
    event = created.json()
    assert event["status"] == "draft" and len(event["sessions"]) == 2
    assert "<script" not in event["translations"]["mn"]["description"]
    assert event["sessions"][0]["ticket"]["url"] == "https://example.com/t"
    # drafts are invisible publicly
    assert client.get("/api/v1/events/test-production").status_code == 404
    # duplicate slug rejected
    assert client.post("/api/v1/admin/events", json=payload, headers=auth).status_code == 409
    # insecure ticket link rejected
    bad = dict(payload, slug="bad-ticket", sessions=[{"starts_at": "2026-12-01T19:00:00+08:00", "ticket": {"url": "http://insecure"}}])
    assert client.post("/api/v1/admin/events", json=bad, headers=auth).status_code == 422
    # update keeps session ids and publishes
    session_id = event["sessions"][0]["id"]
    update = dict(payload, status="published", sessions=[{"id": session_id, "starts_at": "2026-12-01T20:00:00+08:00", "status": "cancelled"}])
    updated = client.put(f"/api/v1/admin/events/{event['id']}", json=update, headers=auth).json()
    assert updated["sessions"][0]["id"] == session_id and updated["sessions"][0]["status"] == "cancelled"
    assert updated["published_at"] is not None
    assert client.get("/api/v1/events/test-production").status_code == 200
    # status endpoint + delete
    assert client.post(f"/api/v1/admin/events/{event['id']}/status", params={"value": "archived"}, headers=auth).json()["status"] == "archived"
    assert client.delete(f"/api/v1/admin/events/{event['id']}", headers=auth).status_code == 204
    assert client.get(f"/api/v1/admin/events/{event['id']}", headers=auth).status_code == 404
    audit = client.get("/api/v1/admin/audit", headers=auth).json()
    assert audit[0]["action"] == "delete" and audit[0]["resource"] == "event"


def test_article_video_gallery_page(client, auth):
    art = client.post("/api/v1/admin/articles", json={"slug": "new-story", "status": "published", "translations": {"mn": {"title": "Шинэ", "body": "<p>x</p>"}}}, headers=auth)
    assert art.status_code == 201 and art.json()["published_at"]
    vid = client.post("/api/v1/admin/videos", json={"youtube_url": "https://youtu.be/dQw4w9WgXcQ", "status": "published", "translations": {"mn": {"title": "Видео"}}}, headers=auth)
    assert vid.status_code == 201 and vid.json()["youtube_id"] == "dQw4w9WgXcQ"
    assert client.post("/api/v1/admin/videos", json={"youtube_url": "https://vimeo.com/1"}, headers=auth).status_code == 422
    media = client.get("/api/v1/admin/media", headers=auth).json()
    gal = client.post("/api/v1/admin/galleries", json={"slug": "new-gallery", "status": "published", "category": "posters", "items": [{"media_id": media[0]["id"]}], "translations": {"mn": {"title": "Цомог"}}}, headers=auth)
    assert gal.status_code == 201 and len(gal.json()["items"]) == 1
    page = client.post("/api/v1/admin/pages", json={"slug": "press", "status": "draft", "translations": {"en": {"title": "Press"}}}, headers=auth)
    assert page.status_code == 201
    assert client.get("/api/v1/pages/press").status_code == 404
    for path in (f"/api/v1/admin/articles/{art.json()['id']}", f"/api/v1/admin/videos/{vid.json()['id']}", f"/api/v1/admin/galleries/{gal.json()['id']}", f"/api/v1/admin/pages/{page.json()['id']}"):
        assert client.delete(path, headers=auth).status_code == 204


def test_media_metadata_usage_and_delete_guard(client, auth):
    media = client.get("/api/v1/admin/media", headers=auth).json()
    poster = next(a for a in media if a["file_name"] == "poster-01.svg")
    updated = client.put(f"/api/v1/admin/media/{poster['id']}", json={"alt": {"en": "Alt"}, "credit": "Studio", "focal_x": 0.3, "focal_y": 0.7, "category": "posters"}, headers=auth).json()
    assert updated["focal_x"] == 0.3 and updated["credit"] == "Studio"
    usage = client.get(f"/api/v1/admin/media/{poster['id']}/usage", headers=auth).json()
    assert any(u["resource"] == "event" for u in usage)
    assert client.delete(f"/api/v1/admin/media/{poster['id']}", headers=auth).status_code == 409
    assert client.post("/api/v1/admin/media/upload-url", json={"file_name": "x.exe", "mime_type": "application/x-msdownload", "size": 10}, headers=auth).status_code == 422
    assert client.post("/api/v1/admin/media/upload-url", json={"file_name": "x.jpg", "mime_type": "image/jpeg", "size": 10}, headers=auth).status_code == 503  # storage unconfigured in tests


def test_homepage_curation_and_navigation(client, auth):
    sections = client.get("/api/v1/admin/homepage", headers=auth).json()
    kinds = [s["kind"] for s in sections]
    assert kinds[0] == "hero_orbit"
    reordered = sections[::-1]
    for s in reordered:
        s["items"] = [{"resource": i["resource"], "resource_id": i["resource_id"]} for i in s["items"]]
    saved = client.put("/api/v1/admin/homepage", json=reordered, headers=auth).json()
    assert [s["kind"] for s in saved] == kinds[::-1]
    assert client.get("/api/v1/homepage").json()["sections"][0]["kind"] == kinds[-1]
    client.put("/api/v1/admin/homepage", json=[dict(s, items=[{"resource": i["resource"], "resource_id": i["resource_id"]} for i in s["items"]]) for s in sections], headers=auth)
    nav = client.get("/api/v1/admin/navigation", headers=auth).json()
    nav.append({"group": "footer", "href": "/press", "label": {"en": "Press"}, "display_order": 99})
    saved_nav = client.put("/api/v1/admin/navigation", json=nav, headers=auth).json()
    assert any(n["href"] == "/press" for n in saved_nav)


def test_settings_users_require_admin(client, auth):
    r = client.put("/api/v1/admin/settings/site", json={"value": {"name": "UB CIRCUS", "contact_email": "hello@example.com"}}, headers=auth)
    assert r.status_code == 200
    assert client.get("/api/v1/settings").json()["site"]["contact_email"] == "hello@example.com"
    assert client.put("/api/v1/admin/settings/other", json={"value": {}}, headers=auth).status_code == 422
    users = client.get("/api/v1/admin/users", headers=auth).json()
    me = next(u for u in users if u["email"] == "dev@ubcircus.local")
    assert client.put(f"/api/v1/admin/users/{me['id']}", json={"role": "editor"}, headers=auth).status_code == 409
    assert client.delete(f"/api/v1/admin/users/{uuid.uuid4()}", headers=auth).status_code == 404
    assert client.post("/api/v1/admin/users/invite", json={"email": "new@example.com"}, headers=auth).status_code == 503  # Supabase unconfigured


def test_messages_flow(client, auth):
    client.post("/api/v1/contact", json={"name": "Press", "email": "press@example.com", "category": "press", "message": "Requesting accreditation for the season."})
    msgs = client.get("/api/v1/admin/messages", params={"resolved": "false"}, headers=auth).json()
    assert msgs and msgs[0]["category"]
    resolved = client.post(f"/api/v1/admin/messages/{msgs[0]['id']}/resolve", headers=auth).json()
    assert resolved["resolved"] is True
