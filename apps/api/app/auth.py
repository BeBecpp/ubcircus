"""Supabase access-token validation and staff authorisation.

Identity comes from Supabase Auth (JWT). Authorisation comes ONLY from the server-managed
`profiles` table — never from user_metadata. There is no public signup: a profile exists
because an admin invited the person (or the email is in BOOTSTRAP_ADMIN_EMAILS).
"""

import uuid
from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db, utcnow
from .models import Profile

bearer = HTTPBearer(auto_error=False)
DEV_USER_ID = uuid.UUID("00000000-0000-4000-8000-00000000d0e5")
DEV_EMAIL = "dev@ubcircus.local"


@dataclass
class Principal:
    id: uuid.UUID
    email: str
    role: str
    profile: Profile

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


@lru_cache(maxsize=4)
def _jwks(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_keys=True, lifespan=3600)


def decode_token(token: str) -> dict:
    s = settings()
    options = {"require": ["sub", "exp"]}
    errors: list[str] = []
    if s.supabase_jwt_secret:
        try:
            return jwt.decode(token, s.supabase_jwt_secret, algorithms=["HS256"], audience=s.supabase_jwt_audience, options=options)
        except jwt.PyJWTError as exc:  # fall through to JWKS
            errors.append(f"hs256: {exc}")
    if s.supabase_url:
        try:
            client = _jwks(f"{s.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json")
            key = client.get_signing_key_from_jwt(token)
            return jwt.decode(token, key.key, algorithms=["ES256", "RS256", "EdDSA"], audience=s.supabase_jwt_audience, options=options)
        except jwt.PyJWTError as exc:
            errors.append(f"jwks: {exc}")
    if not errors:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Authentication is not configured")
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")


def _dev_principal(db: Session) -> Principal:
    profile = db.get(Profile, DEV_USER_ID)
    if profile is None:
        profile = Profile(id=DEV_USER_ID, email=DEV_EMAIL, display_name="Development admin", role="admin", active=True)
        db.add(profile)
        db.commit()
    return Principal(id=profile.id, email=profile.email, role=profile.role, profile=profile)


def get_principal(request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> Principal:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token", headers={"WWW-Authenticate": "Bearer"})
    token = credentials.credentials
    s = settings()
    if s.dev_auth_enabled and token == s.dev_auth_token:
        return _dev_principal(db)
    claims = decode_token(token)
    try:
        user_id = uuid.UUID(str(claims["sub"]))
    except (KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token has no valid subject")
    email = str(claims.get("email") or "").lower()
    profile = db.get(Profile, user_id)
    if profile is None:
        if email and email in s.bootstrap_admins:
            profile = Profile(id=user_id, email=email, display_name=email.split("@")[0], role="admin", active=True)
            db.add(profile)
            db.commit()
        else:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No staff profile for this account")
    if not profile.active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This staff account is inactive")
    if profile.role not in ("admin", "editor"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Unknown role")
    profile.last_seen_at = utcnow()
    db.commit()
    return Principal(id=profile.id, email=profile.email, role=profile.role, profile=profile)


def require_staff(principal: Principal = Depends(get_principal)) -> Principal:
    return principal


def require_admin(principal: Principal = Depends(get_principal)) -> Principal:
    if not principal.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Administrator role required")
    return principal
