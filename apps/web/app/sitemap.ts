import type { MetadataRoute } from 'next';
import { locales } from '@/lib/i18n';
import { content } from '@/lib/content';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const [events, articles] = await Promise.all([content.events({ range: 'all' }).catch(() => []), content.articles().catch(() => [])]);
  const statics = ['', '/events', '/calendar', '/stories', '/media', '/about', '/visit', '/contact'];
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const path of statics) entries.push({ url: `${base}/${locale}${path}`, changeFrequency: 'weekly', priority: path === '' ? 1 : 0.7, alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])) } });
    for (const e of events) entries.push({ url: `${base}/${locale}/events/${e.slug}`, lastModified: e.updated_at, changeFrequency: 'weekly', priority: 0.8 });
    for (const a of articles) entries.push({ url: `${base}/${locale}/stories/${a.slug}`, lastModified: a.updated_at, changeFrequency: 'monthly', priority: 0.6 });
  }
  return entries;
}
