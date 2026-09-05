# Deployment

Two Vercel projects from the private GitHub repository `ubcircus`:

| Project | Root Directory | Runtime | URL |
| --- | --- | --- | --- |
| `ubcircus` | `apps/web` | Next.js | production frontend |
| `ubcircus-api` | `apps/api` | Vercel Python (FastAPI, entrypoint `app/main.py`) | content API |

Deploy the API first: the frontend's static pages fetch content from it at build time when `CONTENT_MODE=database`.

## 1. Supabase (project `ubcircus`)

1. `npx supabase login` once, then from the repo root `npx supabase link --project-ref <ref>`.
2. Run the schema with Alembic against the pooler (session mode):
   ```bash
   cd apps/api
   DATABASE_URL="postgresql+psycopg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require" .venv/Scripts/python -m alembic upgrade head
   DATABASE_URL="…same…" .venv/Scripts/python -m app.services.seed      # labelled sample content
   ```
   The migration creates every table, index, the `is_staff()` / `is_admin()` helpers, RLS policies, the `profiles → auth.users` foreign key and the public `media` bucket with staff-only write policies.
3. Authentication → disable public signups (Backstage invites staff). Keep email confirmations on; magic links use `/admin/auth/callback` (add `https://<frontend>/admin/auth/callback` to the redirect allow-list).
4. Run **Security Advisor** and **Performance Advisor** in the dashboard after migrating; there should be no RLS or `search_path` findings. Re-run after any schema change.
5. Copy the project URL, the **publishable** key (frontend) and the **secret** key (API only).

## 2. Environment variables

`ubcircus-api` (Production + Preview):

| Name | Value |
| --- | --- |
| `ENVIRONMENT` | `production` |
| `DATABASE_URL` | Supabase pooler URL, transaction mode port 6543, `?sslmode=require` |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | publishable key |
| `SUPABASE_SECRET_KEY` | secret / service-role key |
| `STORAGE_BUCKET` | `media` |
| `ALLOWED_ORIGINS` | `https://ubcircus.vercel.app,https://<custom-domain>` |
| `PUBLIC_SITE_URL` | `https://ubcircus.vercel.app` |
| `BOOTSTRAP_ADMIN_EMAILS` | first administrator email(s) |

`ubcircus` (Production + Preview):

| Name | Value |
| --- | --- |
| `CONTENT_MODE` | `database` (use `demo` for previews without a database) |
| `API_URL` | `https://ubcircus-api.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | `https://ubcircus.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key |

Never set `DEV_AUTH_TOKEN` or the secret key on the frontend project.

## 3. Vercel CLI flow

```bash
vercel link --yes --project ubcircus-api --cwd apps/api
vercel env add ENVIRONMENT production --cwd apps/api            # repeat per variable
vercel deploy --cwd apps/api                                    # preview → check /health
vercel deploy --prod --cwd apps/api

vercel link --yes --project ubcircus --cwd apps/web
vercel git connect --yes --cwd apps/web                          # GitHub → Vercel
vercel deploy --cwd apps/web                                    # preview → smoke test
vercel deploy --prod --cwd apps/web
```

Set each project's **Root Directory** with `vercel project update <name> --root-directory apps/web` (or `apps/api`). Use `vercel link --repo` at the repository root so CLI deploys upload the whole monorepo.

Vercel blocks deployments whose commit author email is not linked to the GitHub account (Hobby teams). Commit with an address attached to the account, e.g. the GitHub noreply address `<id>+<login>@users.noreply.github.com`.

## 4. First administrator

Add your email to `BOOTSTRAP_ADMIN_EMAILS` on the API, create the user in Supabase Auth (Authentication → Users → *Invite user*), open `/admin/login`, request a magic link or set a password. The first sign-in creates the admin profile; afterwards invite colleagues from Backstage → Users.

## 5. Verification checklist

- `GET https://ubcircus-api.vercel.app/health` → `status: ok`, `database: ok`, `storage: ok`
- `/mn`, `/en`, `/tr` — hero, next on stage, coverflow, what's on, film, stories, visit, footer
- `/mn/events`, `/mn/events/<slug>` (sessions, booking rail, mobile sticky CTA), `/mn/calendar`
- `/mn/stories`, `/mn/stories/<slug>`, `/mn/media`, `/mn/about`, `/mn/visit`, `/mn/contact` (submit → 202)
- `/admin/login` → sign in → overview → edit an event → public page updates (on-demand revalidation)
- Backstage → Library → upload → asset appears in Supabase Storage `media` bucket
- No console errors; no horizontal overflow at 375 / 390 / 430 / 768 / 1024 / 1280 / 1440
- `vercel logs` for both projects clean

## Rollback

Each project can be rolled back independently from the Vercel dashboard (Deployments → Promote). Schema changes are versioned by Alembic (`alembic downgrade -1`).
