# UB CIRCUS — The Ring After Dark

Greenfield website and content platform for the Ulaanbaatar Circus. A dark, editorial, performance-first public site in Mongolian, English and Turkish, with a "Backstage" control room for staff.

- **Frontend** `apps/web` — Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Motion, Three.js / React Three Fiber / Drei
- **API** `apps/api` — FastAPI, Pydantic v2, SQLAlchemy 2, Alembic
- **Platform** — Supabase (PostgreSQL, Auth, Storage), Vercel (`ubcircus` frontend, `ubcircus-api` backend)

```
apps/
  web/                 Next.js site + /admin (Backstage)
    app/[locale]/      public routes (mn · en · tr)
    app/admin/         staff control room
    components/        site/, home/, events/, media/, admin/, three/, ui/
    lib/content/       content contract, demo provider, API provider, pure selectors
    lib/api/schema.d.ts   TypeScript types generated from the API's OpenAPI document
    styles/            base · site · hero · home · pages · admin
    public/placeholders   original SVG stage studies (sample artwork)
  api/
    app/               main · config · db · models · schemas · auth · security · db_security
    app/routers/       health · public · admin
    app/services/      content · admin · seed · supabase
    app/seed/content.json   canonical sample content (also copied to the web demo provider)
    alembic/           migrations (tables + Postgres RLS/policies/storage)
    tests/             pytest (SQLite, dev token)
docs/                  ARCHITECTURE · CONTENT_MODEL · DESIGN_SYSTEM · SETUP · DEPLOYMENT
scripts/               build-content · create-artwork · screenshot · admin-smoke
```

## Quick start

```bash
npm install                                   # workspaces: apps/web
cd apps/api && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt && cd ../..
cp apps/api/.env.example apps/api/.env        # SQLite + DEV_AUTH_TOKEN for local work
cd apps/api && .venv/Scripts/python -m alembic upgrade head && .venv/Scripts/python -m app.services.seed && cd ../..
npm run dev:api                               # http://127.0.0.1:8000  (/health, /docs)
npm run dev                                   # http://127.0.0.1:3000  (/mn, /admin)
```

`apps/web/.env.local` with `CONTENT_MODE=database`, `API_URL=http://127.0.0.1:8000` and the same `DEV_AUTH_TOKEN` gives a full local stack; without it the site serves labelled sample content ("demo mode") and `/admin` shows the sign-in page only.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run typecheck` / `npm run test` | TypeScript strict check / vitest for the content layer |
| `npm run test:api` | pytest: public API, admin API, auth, rate limiting, Alembic round-trip |
| `npm run build` | Next.js production build |
| `npm run content:build` | regenerate the sample content JSON for API seed + web demo |
| `npm run api:types` | regenerate `lib/api/schema.d.ts` from the FastAPI OpenAPI document |
| `npm run smoke` / `npm run smoke:admin` | Playwright screenshots of public routes / Backstage (needs running servers) |

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — runtime boundaries, content modes, auth, caching
- [docs/CONTENT_MODEL.md](docs/CONTENT_MODEL.md) — tables, translations, sessions, security model
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — The Ring After Dark: tokens, type, motion, hero, Backstage
- [docs/SETUP.md](docs/SETUP.md) — local development in detail
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Supabase, Vercel, environment variables, verification checklist

All sample content is clearly labelled and fictional. No real history, people, prices, addresses or ticket links are asserted anywhere in the codebase.
