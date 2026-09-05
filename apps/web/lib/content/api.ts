import type { Article, Category, ContentProvider, Event, Gallery, Homepage, MediaAsset, NavigationItem, Page, Performance, SiteSettings, Venue, Video } from './types';

const base = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const REVALIDATE = Number(process.env.CONTENT_REVALIDATE_SECONDS ?? 60);

export class ContentError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ContentError';
  }
}

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  if (!base) throw new ContentError('API_URL is not configured');
  const url = new URL(`${base}/api/v1${path}`);
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  const res = await fetch(url, { next: { revalidate: REVALIDATE }, headers: { accept: 'application/json' } });
  if (res.status === 404) throw new ContentError('Not found', 404);
  if (!res.ok) throw new ContentError(`API responded ${res.status} for ${path}`, res.status);
  return (await res.json()) as T;
}
async function maybe<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ContentError && error.status === 404) return null;
    throw error;
  }
}

export const apiProvider: ContentProvider = {
  mode: 'api',
  homepage: () => get<Homepage>('/homepage'),
  events: (query = {}) => get<Event[]>('/events', { range: query.range, category: query.category, month: query.month, date: query.date, limit: query.limit }),
  event: (slug) => maybe(get<Event>(`/events/${encodeURIComponent(slug)}`)),
  calendar: (month) => get<Performance[]>('/calendar', { month }),
  articles: (limit) => get<Article[]>('/articles', { limit }),
  article: (slug) => maybe(get<Article>(`/articles/${encodeURIComponent(slug)}`)),
  videos: () => get<Video[]>('/videos'),
  galleries: () => get<Gallery[]>('/galleries'),
  media: () => get<MediaAsset[]>('/media'),
  page: (slug) => maybe(get<Page>(`/pages/${encodeURIComponent(slug)}`)),
  venues: () => get<Venue[]>('/venues'),
  categories: (kind) => get<Category[]>('/categories', { kind }),
  navigation: () => get<NavigationItem[]>('/navigation'),
  settings: () => get<SiteSettings>('/settings'),
  async contact(payload) {
    if (!base) return { ok: false, error: 'unconfigured' };
    const res = await fetch(`${base}/api/v1/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store' });
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    return { ok: false, error: body.detail ?? `status ${res.status}` };
  },
};
