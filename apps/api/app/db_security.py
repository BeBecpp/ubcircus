"""Postgres/Supabase-only security layer applied by the initial Alembic migration.

Principles
- Every public-schema table has RLS enabled. Tables the API alone should touch (audit, contact
  messages, rate limits) get no policies at all: anon/authenticated are denied, the API's
  database role bypasses RLS.
- Anonymous visitors may read published content only. Staff (active profile with role
  admin/editor) may read everything and write content. Authorisation is derived from the
  server-managed `public.profiles` table through `public.is_staff()` — never from user_metadata.
- Helper functions are SECURITY DEFINER with an empty search_path (Supabase advisor rule).
- `profiles.id` references `auth.users(id)`; profiles are created by the API (invite/bootstrap).
- The `media` storage bucket is public-read; only staff can write to it.
"""

CONTENT_TABLES = [
    "event_categories",
    "article_categories",
    "venues",
    "media_assets",
    "videos",
    "video_translations",
    "events",
    "event_translations",
    "event_gallery_items",
    "event_sessions",
    "event_ticket_links",
    "articles",
    "article_translations",
    "galleries",
    "gallery_translations",
    "gallery_items",
    "pages",
    "page_translations",
    "homepage_sections",
    "homepage_section_items",
    "navigation_items",
    "site_settings",
]
PRIVATE_TABLES = ["profiles", "audit_entries", "contact_messages", "rate_limit_buckets"]

# SELECT visibility for anonymous visitors, per table (staff always see everything).
PUBLIC_READ = {
    "event_categories": "true",
    "article_categories": "true",
    "venues": "true",
    "media_assets": "true",
    "navigation_items": "true",
    "homepage_sections": "true",
    "homepage_section_items": "true",
    "site_settings": "true",
    "videos": "status = 'published'",
    "video_translations": "exists (select 1 from public.videos v where v.id = video_id and v.status = 'published')",
    "events": "status = 'published'",
    "event_translations": "exists (select 1 from public.events e where e.id = event_id and e.status = 'published')",
    "event_gallery_items": "exists (select 1 from public.events e where e.id = event_id and e.status = 'published')",
    "event_sessions": "exists (select 1 from public.events e where e.id = event_id and e.status = 'published')",
    "event_ticket_links": "exists (select 1 from public.event_sessions s join public.events e on e.id = s.event_id where s.id = session_id and e.status = 'published')",
    "articles": "status = 'published'",
    "article_translations": "exists (select 1 from public.articles a where a.id = article_id and a.status = 'published')",
    "galleries": "status = 'published'",
    "gallery_translations": "exists (select 1 from public.galleries g where g.id = gallery_id and g.status = 'published')",
    "gallery_items": "exists (select 1 from public.galleries g where g.id = gallery_id and g.status = 'published')",
    "pages": "status = 'published'",
    "page_translations": "exists (select 1 from public.pages p where p.id = page_id and p.status = 'published')",
}


def _policies() -> list[str]:
    out: list[str] = []
    for table in CONTENT_TABLES:
        cond = PUBLIC_READ[table]
        out += [
            f"alter table public.{table} enable row level security",
            f"revoke all on table public.{table} from anon, authenticated",
            f"grant select on table public.{table} to anon, authenticated",
            f"grant insert, update, delete on table public.{table} to authenticated",
            f'create policy "{table}: public read" on public.{table} for select to anon, authenticated using (({cond}) or (select public.is_staff()))',
            f'create policy "{table}: staff insert" on public.{table} for insert to authenticated with check ((select public.is_staff()))',
            f'create policy "{table}: staff update" on public.{table} for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))',
            f'create policy "{table}: staff delete" on public.{table} for delete to authenticated using ((select public.is_staff()))',
        ]
    for table in PRIVATE_TABLES:
        out += [f"alter table public.{table} enable row level security", f"revoke all on table public.{table} from anon, authenticated"]
    out += [
        "grant select on table public.profiles to authenticated",
        'create policy "profiles: read own" on public.profiles for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()))',
    ]
    return out


POSTGRES_SECURITY: list[str] = [
    # helpers -------------------------------------------------------------
    """create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.active and p.role in ('admin', 'editor')
  );
$$""",
    """create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.active and p.role = 'admin'
  );
$$""",
    "revoke all on function public.is_staff() from public",
    "revoke all on function public.is_admin() from public",
    "grant execute on function public.is_staff() to anon, authenticated, service_role",
    "grant execute on function public.is_admin() to anon, authenticated, service_role",
    # identity ------------------------------------------------------------
    "alter table public.profiles add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade",
    # updated_at trigger for direct writes ---------------------------------
    """create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$""",
    *_policies(),
    # storage -------------------------------------------------------------
    """insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 26214400, array['image/jpeg','image/png','image/webp','image/avif','image/gif','image/svg+xml'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types""",
    """create policy "media: public read" on storage.objects for select to anon, authenticated using (bucket_id = 'media')""",
    """create policy "media: staff insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and (select public.is_staff()))""",
    """create policy "media: staff update" on storage.objects for update to authenticated using (bucket_id = 'media' and (select public.is_staff())) with check (bucket_id = 'media' and (select public.is_staff()))""",
    """create policy "media: staff delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and (select public.is_staff()))""",
]

POSTGRES_SECURITY_DOWN: list[str] = [
    *[f'drop policy if exists "media: {p}" on storage.objects' for p in ("public read", "staff insert", "staff update", "staff delete")],
    *[f'drop policy if exists "{t}: {p}" on public.{t}' for t in CONTENT_TABLES for p in ("public read", "staff insert", "staff update", "staff delete")],
    'drop policy if exists "profiles: read own" on public.profiles',
    "alter table public.profiles drop constraint if exists profiles_id_fkey",
    "drop function if exists public.touch_updated_at()",
    "drop function if exists public.is_admin()",
    "drop function if exists public.is_staff()",
]
