import raw from './demo.json';
import type { AboutFeature, Article, Category, ContentDocument, ContentProvider, Event, Gallery, Homepage, MediaAsset, Performance, SiteSettings, Tr, Video } from './types';
import { filterEvents, hasUpcoming, monthKey, sessionsOf, sortByNextSession, upcomingSessions } from './select';

const doc = raw as unknown as ContentDocument;

function resolve() {
  const media = new Map(doc.media.map((m) => [m.id, m]));
  const categories = [...doc.event_categories, ...doc.article_categories];
  const category = new Map(categories.map((c) => [c.id, c]));
  const venue = new Map(doc.venues.map((v) => [v.id, v]));
  const videos: Video[] = doc.videos.map(({ poster_id, ...v }) => ({ ...v, poster: poster_id ? media.get(poster_id) ?? null : null }));
  const video = new Map(videos.map((v) => [v.id, v]));
  const events: Event[] = doc.events.map(({ category_id, venue_id, poster_id, hero_id, video_id, gallery_ids, ...e }) => ({
    ...e,
    category: category_id ? category.get(category_id) ?? null : null,
    venue: venue_id ? venue.get(venue_id) ?? null : null,
    poster: poster_id ? media.get(poster_id) ?? null : null,
    hero: hero_id ? media.get(hero_id) ?? null : null,
    video: video_id ? video.get(video_id) ?? null : null,
    gallery: gallery_ids.map((id) => media.get(id)).filter((m): m is MediaAsset => !!m),
  }));
  const articles: Article[] = doc.articles.map(({ category_id, lead_image_id, ...a }) => ({
    ...a,
    category: category_id ? category.get(category_id) ?? null : null,
    lead_image: lead_image_id ? media.get(lead_image_id) ?? null : null,
  }));
  const galleries: Gallery[] = doc.galleries.map((g) => ({ ...g, items: g.items.map((i) => ({ id: i.id, media: media.get(i.media_id)!, display_order: i.display_order, caption: i.caption })).filter((i) => i.media) }));
  const settings = Object.fromEntries(doc.site_settings.map((s) => [s.key, s.value])) as unknown as SiteSettings;
  return { media, categories, events, articles, videos, galleries, settings };
}
const data = resolve();
const published = <T extends { status: string }>(items: T[]) => items.filter((i) => i.status === 'published');

function homepage(now: Date): Homepage {
  const events = published(data.events);
  const byId = new Map(events.map((e) => [e.id, e]));
  const articles = new Map(published(data.articles).map((a) => [a.id, a]));
  const sections = [...doc.homepage_sections].sort((a, b) => a.display_order - b.display_order);
  const section = (kind: string) => sections.find((s) => s.kind === kind);
  const pick = <T,>(kind: string, map: Map<string, T>) => (section(kind)?.items ?? []).slice().sort((a, b) => a.display_order - b.display_order).map((i) => map.get(i.resource_id)).filter((x): x is T => !!x);
  const heroSection = section('hero_orbit');
  const nextSection = section('next_on_stage');
  const nextLimit = Number(nextSection?.settings.limit ?? 4);
  const pinned = pick('next_on_stage', byId);
  const distinct = (list: Performance[]) => {
    const seen = new Set<string>();
    return list.filter((p) => (seen.has(p.event.id) ? false : (seen.add(p.event.id), true)));
  };
  const next: Performance[] = distinct(pinned.length ? upcomingSessions(pinned, now) : upcomingSessions(events, now)).slice(0, nextLimit);
  const about = section('about_feature');
  const aboutSettings = about?.settings as { year_label?: string; year_caption?: Tr; title?: Tr; body?: Tr; image_id?: string; href?: string } | undefined;
  const aboutFeature: AboutFeature | null = about?.enabled && aboutSettings ? { year_label: aboutSettings.year_label ?? '', year_caption: aboutSettings.year_caption ?? {}, title: aboutSettings.title ?? {}, body: aboutSettings.body ?? {}, image: aboutSettings.image_id ? data.media.get(aboutSettings.image_id) ?? null : null, href: aboutSettings.href ?? '/about' } : null;
  const visitSection = section('plan_your_visit');
  const venueId = (visitSection?.settings as { venue_id?: string } | undefined)?.venue_id;
  return {
    sections: sections.map((s) => ({ kind: s.kind, enabled: s.enabled })),
    hero: { caption: (heroSection?.settings.caption as Tr) ?? {}, events: pick('hero_orbit', byId) },
    next_on_stage: next,
    featured: pick('featured_performances', byId),
    whats_on: sortByNextSession(events.filter((e) => hasUpcoming(e, now)), now).slice(0, Number(section('whats_on')?.settings.limit ?? 8)),
    video: pick('featured_video', new Map(published(data.videos).map((v) => [v.id, v])))[0] ?? published(data.videos).find((v) => v.featured) ?? null,
    in_motion: pick('in_motion', data.media),
    stories: pick('stories', articles),
    about: aboutFeature,
    visit: (venueId ? doc.venues.find((v) => v.id === venueId) : doc.venues[0]) ?? null,
    categories: data.categories.filter((c) => c.kind === 'event'),
  };
}

export const demoProvider: ContentProvider = {
  mode: 'demo',
  async homepage() {
    return homepage(new Date());
  },
  async events(query = {}) {
    const now = new Date();
    const list = filterEvents(published(data.events), { range: query.range ?? 'all', category: query.category, month: query.month, date: query.date }, now);
    const sorted = sortByNextSession(list, now);
    return query.limit ? sorted.slice(0, query.limit) : sorted;
  },
  async event(slug) {
    return published(data.events).find((e) => e.slug === slug) ?? null;
  },
  async calendar(month) {
    return sessionsOf(published(data.events)).filter((p) => monthKey(p.session.starts_at) === month);
  },
  async articles(limit) {
    const list = published(data.articles).sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''));
    return limit ? list.slice(0, limit) : list;
  },
  async article(slug) {
    return published(data.articles).find((a) => a.slug === slug) ?? null;
  },
  async videos() {
    return published(data.videos).sort((a, b) => a.display_order - b.display_order);
  },
  async galleries() {
    return published(data.galleries);
  },
  async media() {
    return [...data.media.values()];
  },
  async page(slug) {
    return published(doc.pages).find((p) => p.slug === slug) ?? null;
  },
  async venues() {
    return doc.venues;
  },
  async categories(kind) {
    return (kind ? data.categories.filter((c) => c.kind === kind) : data.categories) as Category[];
  },
  async navigation() {
    return [...doc.navigation_items].sort((a, b) => a.display_order - b.display_order);
  },
  async settings() {
    return data.settings;
  },
  async contact() {
    return { ok: false, error: 'demo' };
  },
};
