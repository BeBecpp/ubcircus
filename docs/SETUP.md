# Local setup

## Requirements

Node 24 (npm 11), Python 3.12, Git. No Docker or Postgres needed locally: the API runs on SQLite.

## Frontend only (demo mode)

```bash
npm install
npm run dev            # http://127.0.0.1:3000/mn
```

Without `apps/web/.env.local` the site uses `lib/content/demo.json` and `/admin` shows the sign-in page.

## Full stack (API on SQLite)

```bash
cd apps/api
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt     # macOS/Linux: .venv/bin/pip
cp .env.example .env                              # keep DATABASE_URL=sqlite:///./ubcircus.db, set DEV_AUTH_TOKEN
.venv/Scripts/python -m alembic upgrade head
.venv/Scripts/python -m app.services.seed
.venv/Scripts/python -m uvicorn app.main:app --port 8000 --reload
```

`apps/web/.env.local`:

```
CONTENT_MODE=database
API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
DEV_AUTH_TOKEN=<same value as apps/api/.env>
```

Then `npm run dev`. Open `/admin/login` → *Start development session*. The dev session is refused in production builds and on Vercel.

## Tests and checks

```bash
npm run typecheck
npm run test              # vitest (content layer)
npm run test:api          # pytest (API + Alembic round trip)
npm run build             # Next.js production build
npm run smoke             # Playwright screenshots of public routes (servers running)
npm run smoke:admin       # Backstage smoke with dev session (servers running)
```

Playwright uses the Chromium bundled with `@playwright/test`; set `CHROME_PATH` to reuse an existing browser binary.

## Regenerating generated files

- `npm run content:build` — sample content JSON (API seed + web demo)
- `npm run artwork:build` — SVG stage studies in `apps/web/public/placeholders`
- `npm run api:types` — `apps/web/lib/api/schema.d.ts` from the OpenAPI document

## New migration

```bash
cd apps/api
.venv/Scripts/python -m alembic revision --autogenerate -m "describe change"
```

Review the generated file; Postgres-only statements (policies, functions) belong in `app/db_security.py` and are executed when `op.get_bind().dialect.name == "postgresql"`.
