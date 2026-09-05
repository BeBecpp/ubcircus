"""UB CIRCUS content API — FastAPI, Pydantic v2, SQLAlchemy 2. Deployed as the Vercel project `ubcircus-api`."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from .config import settings
from .routers import admin, health, public

TAGS = [
    {"name": "health", "description": "Dependency status."},
    {"name": "public", "description": "Published content only. Cached by the frontend."},
    {"name": "admin", "description": "Backstage editing. Requires a Supabase access token and an active staff profile."},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="UB CIRCUS API",
    version="2.0.0",
    description="Content API for the Ulaanbaatar Circus website (The Ring After Dark).",
    openapi_tags=TAGS,
    lifespan=lifespan,
    docs_url="/docs" if settings().is_development else None,
    redoc_url=None,
)
app.add_middleware(CORSMiddleware, allow_origins=settings().origins, allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], allow_headers=["authorization", "content-type"], allow_credentials=False, max_age=600)
app.include_router(health.router)
app.include_router(public.router)
app.include_router(admin.router)


@app.exception_handler(OperationalError)
async def database_unavailable(_: Request, exc: OperationalError) -> JSONResponse:
    return JSONResponse({"detail": "Database unavailable"}, status_code=503)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Cache-Control", "no-store" if request.url.path.startswith("/api/v1/admin") else "public, max-age=30, s-maxage=60")
    return response


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {"name": "UB CIRCUS API", "health": "/health", "public": "/api/v1", "openapi": "/openapi.json"}
