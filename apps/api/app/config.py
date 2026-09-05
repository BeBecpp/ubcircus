from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. Secrets stay server-side; only *_publishable_* values may reach browsers."""

    environment: str = "development"
    database_url: str = "sqlite:///./ubcircus.db"
    content_mode: str = "database"

    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_secret_key: str = ""  # service role / secret key — never exposed to the frontend
    supabase_jwt_secret: str = ""  # optional HS256 fallback for legacy projects; JWKS is preferred
    supabase_jwt_audience: str = "authenticated"

    storage_bucket: str = "media"
    max_upload_bytes: int = 25 * 1024 * 1024

    allowed_origins: str = "http://127.0.0.1:3000,http://localhost:3000"
    public_site_url: str = "http://localhost:3000"

    bootstrap_admin_emails: str = ""  # comma-separated emails that receive an admin profile on first login
    dev_auth_token: str = ""  # development-only bearer token; refused outside ENVIRONMENT=development

    contact_rate_limit: int = 5
    contact_rate_window_seconds: int = 3600

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("environment")
    @classmethod
    def _normalise_env(cls, value: str) -> str:
        return value.strip().lower() or "development"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def bootstrap_admins(self) -> set[str]:
        return {e.strip().lower() for e in self.bootstrap_admin_emails.split(",") if e.strip()}

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    @property
    def dev_auth_enabled(self) -> bool:
        """Static dev token only in development, never on Vercel or when the token is unset."""
        import os

        return bool(self.dev_auth_token) and self.is_development and not os.environ.get("VERCEL")

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_secret_key)


@lru_cache
def settings() -> Settings:
    return Settings()
