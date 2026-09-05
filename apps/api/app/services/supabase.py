"""Server-side Supabase client (Storage + Auth admin) using the secret key. Never imported by the frontend."""

import uuid
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException, status

from ..config import settings

ALLOWED_MIME = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif", "image/svg+xml": "svg"}


class Supabase:
    def __init__(self) -> None:
        s = settings()
        self.url = s.supabase_url.rstrip("/")
        self.key = s.supabase_secret_key
        self.bucket = s.storage_bucket
        self.enabled = s.supabase_configured

    def _headers(self, extra: dict | None = None) -> dict:
        h = {"apikey": self.key, "Authorization": f"Bearer {self.key}"}
        if extra:
            h.update(extra)
        return h

    def _require(self) -> None:
        if not self.enabled:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Supabase is not configured on the API")

    # ------------------------------------------------------------------ storage
    def object_key(self, file_name: str, mime_type: str) -> str:
        ext = ALLOWED_MIME.get(mime_type) or file_name.rsplit(".", 1)[-1].lower()[:5]
        now = datetime.now(timezone.utc)
        return f"{now:%Y/%m}/{uuid.uuid4().hex}.{ext}"

    def public_url(self, key: str) -> str:
        return f"{self.url}/storage/v1/object/public/{self.bucket}/{key}"

    def signed_upload(self, key: str, upsert: bool = False) -> dict:
        self._require()
        with httpx.Client(timeout=15) as client:
            r = client.post(f"{self.url}/storage/v1/object/upload/sign/{self.bucket}/{key}", headers=self._headers({"x-upsert": "true" if upsert else "false"}))
        if r.status_code >= 400:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Storage refused the upload ticket: {r.text[:200]}")
        data = r.json()
        return {"upload_url": f"{self.url}/storage/v1{data['url']}", "token": data.get("token"), "public_url": self.public_url(key), "headers": {"x-upsert": "true"} if upsert else {}}

    def head_object(self, key: str) -> dict | None:
        self._require()
        with httpx.Client(timeout=15) as client:
            r = client.head(self.public_url(key), headers=self._headers())
        if r.status_code >= 400:
            return None
        return {"size": int(r.headers.get("content-length") or 0), "mime_type": r.headers.get("content-type", "")}

    def download(self, key: str, limit: int) -> bytes | None:
        self._require()
        with httpx.Client(timeout=30) as client:
            r = client.get(self.public_url(key), headers=self._headers({"Range": f"bytes=0-{limit}"}))
        return r.content if r.status_code < 400 else None

    def delete_object(self, key: str) -> None:
        self._require()
        with httpx.Client(timeout=15) as client:
            client.delete(f"{self.url}/storage/v1/object/{self.bucket}/{key}", headers=self._headers())

    # ------------------------------------------------------------------ auth admin
    def invite_user(self, email: str, role: str, display_name: str) -> dict:
        self._require()
        with httpx.Client(timeout=20) as client:
            r = client.post(f"{self.url}/auth/v1/invite", headers=self._headers(), json={"email": email, "data": {"display_name": display_name}})
            if r.status_code >= 400:
                raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Supabase Auth refused the invitation: {r.text[:200]}")
            user = r.json()
            client.put(f"{self.url}/auth/v1/admin/users/{user['id']}", headers=self._headers(), json={"app_metadata": {"role": role}})
        return user

    def set_user_role(self, user_id: uuid.UUID, role: str) -> None:
        if not self.enabled:
            return
        with httpx.Client(timeout=20) as client:
            client.put(f"{self.url}/auth/v1/admin/users/{user_id}", headers=self._headers(), json={"app_metadata": {"role": role}})

    def delete_user(self, user_id: uuid.UUID) -> None:
        if not self.enabled:
            return
        with httpx.Client(timeout=20) as client:
            client.delete(f"{self.url}/auth/v1/admin/users/{user_id}", headers=self._headers())

    def ping(self) -> str:
        if not self.enabled:
            return "unconfigured"
        try:
            with httpx.Client(timeout=8) as client:
                r = client.get(f"{self.url}/storage/v1/bucket/{self.bucket}", headers=self._headers())
            return "ok" if r.status_code == 200 else f"error:{r.status_code}"
        except httpx.HTTPError:
            return "unreachable"


def supabase() -> Supabase:
    return Supabase()
