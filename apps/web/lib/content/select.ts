import { defaultLocale, monthShort, monthLong, weekdayShort, type Locale } from '@/lib/i18n';
import type { Event, Performance, Session, Tr } from './types';

export const TIME_ZONE = 'Asia/Ulaanbaatar';

/** Pick a translation with fallback: requested locale → Mongolian → first available. */
export function tx<T>(map: Tr<T> | null | undefined, locale: Locale): T | undefined {
  if (!map) return undefined;
  return map[locale] ?? map[defaultLocale] ?? Object.values(map).find((v) => v !== undefined);
}
export function txs(map: Tr | null | undefined, locale: Locale): string {
  return tx(map, locale) ?? '';
}
type TranslationOf<T> = T extends { translations: Tr<infer U> } ? U : never;
export function translated<T extends { translations: Tr<{ title: string }> }>(item: T, locale: Locale): TranslationOf<T> {
  return (tx(item.translations, locale) ?? { title: 'Untitled' }) as TranslationOf<T>;
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };
const partCache = new Map<string, Parts>();
/** Calendar parts of an instant in the editorial time zone (Asia/Ulaanbaatar, no DST). */
export function parts(iso: string): Parts {
  const cached = partCache.get(iso);
  if (cached) return cached;
  const date = new Date(iso);
  const f = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false, weekday: 'short' });
  const map: Record<string, string> = {};
  for (const p of f.formatToParts(date)) map[p.type] = p.value;
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = { year: +map.year, month: +map.month, day: +map.day, hour: +map.hour % 24, minute: +map.minute, weekday: weekdays.indexOf(map.weekday) };
  partCache.set(iso, result);
  return result;
}
const two = (n: number) => String(n).padStart(2, '0');
export function dayKey(iso: string) {
  const p = parts(iso);
  return `${p.year}-${two(p.month)}-${two(p.day)}`;
}
export function monthKey(iso: string) {
  const p = parts(iso);
  return `${p.year}-${two(p.month)}`;
}
export function fmtDay(iso: string) {
  return two(parts(iso).day);
}
export function fmtTime(iso: string) {
  const p = parts(iso);
  return `${two(p.hour)}:${two(p.minute)}`;
}
export function fmtMonth(iso: string, locale: Locale) {
  return monthShort[locale][parts(iso).month - 1];
}
export function fmtMonthLong(iso: string, locale: Locale) {
  return monthLong[locale][parts(iso).month - 1];
}
export function fmtWeekday(iso: string, locale: Locale) {
  return weekdayShort[locale][parts(iso).weekday];
}
/** e.g. "FRI 12 SEP" / "БА 12 9-р сар" */
export function fmtDateLine(iso: string, locale: Locale) {
  return `${fmtWeekday(iso, locale)} ${fmtDay(iso)} ${fmtMonth(iso, locale)}`;
}
export function fmtFullDate(iso: string, locale: Locale) {
  const p = parts(iso);
  if (locale === 'mn') return `${p.year} оны ${monthLong.mn[p.month - 1].toLowerCase()}ын ${p.day}`;
  if (locale === 'tr') return `${p.day} ${monthLong.tr[p.month - 1]} ${p.year}`;
  return `${p.day} ${monthLong.en[p.month - 1]} ${p.year}`;
}
export function fmtYear(iso: string) {
  return String(parts(iso).year);
}
export function monthKeyOf(date: Date) {
  return monthKey(date.toISOString());
}
export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${two(d.getUTCMonth() + 1)}`;
}
export function daysInMonth(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
export function isValidMonthKey(key: string | undefined): key is string {
  return !!key && /^\d{4}-(0[1-9]|1[0-2])$/.test(key);
}
export function isValidDayKey(key: string | undefined): key is string {
  return !!key && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(key);
}

export function sessionsOf(events: Event[]): Performance[] {
  return events.flatMap((event) => event.sessions.map((session) => ({ session, event }))).sort((a, b) => a.session.starts_at.localeCompare(b.session.starts_at));
}
export function isPast(session: Session, now: Date) {
  return new Date(session.starts_at).getTime() < now.getTime();
}
export function upcomingSessions(events: Event[], now: Date): Performance[] {
  return sessionsOf(events).filter(({ session }) => !isPast(session, now));
}
export function nextSession(event: Event, now: Date): Session | null {
  return [...event.sessions].sort((a, b) => a.starts_at.localeCompare(b.starts_at)).find((s) => !isPast(s, now)) ?? null;
}
export function lastSession(event: Event): Session | null {
  return [...event.sessions].sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0] ?? null;
}
export function hasUpcoming(event: Event, now: Date) {
  return event.sessions.some((s) => !isPast(s, now));
}
export function sessionRange(event: Event): { first: Session; last: Session } | null {
  if (!event.sessions.length) return null;
  const sorted = [...event.sessions].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return { first: sorted[0], last: sorted[sorted.length - 1] };
}
export function sortByNextSession(events: Event[], now: Date) {
  return [...events].sort((a, b) => {
    const an = nextSession(a, now)?.starts_at ?? `9${lastSession(a)?.starts_at ?? ''}`;
    const bn = nextSession(b, now)?.starts_at ?? `9${lastSession(b)?.starts_at ?? ''}`;
    return an.localeCompare(bn);
  });
}

export function startOfWeekKey(now: Date) {
  return dayKey(now.toISOString());
}
export function addDays(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return `${date.getUTCFullYear()}-${two(date.getUTCMonth() + 1)}-${two(date.getUTCDate())}`;
}

export type EventFilter = { range?: 'upcoming' | 'past' | 'all' | 'week' | 'month'; category?: string; month?: string; date?: string };
/** Pure event filtering used by the demo provider and the client-side What's On section. */
export function filterEvents(events: Event[], filter: EventFilter, now: Date): Event[] {
  const today = dayKey(now.toISOString());
  const weekEnd = addDays(today, 7);
  const thisMonth = monthKey(now.toISOString());
  return events.filter((event) => {
    if (filter.category && event.category?.slug !== filter.category) return false;
    const keys = event.sessions.map((s) => dayKey(s.starts_at));
    if (filter.date) return keys.includes(filter.date);
    if (filter.month) return event.sessions.some((s) => monthKey(s.starts_at) === filter.month);
    switch (filter.range) {
      case 'past':
        return event.sessions.length > 0 && !hasUpcoming(event, now);
      case 'week':
        return event.sessions.some((s) => !isPast(s, now) && dayKey(s.starts_at) <= weekEnd);
      case 'month':
        return event.sessions.some((s) => !isPast(s, now) && monthKey(s.starts_at) === thisMonth);
      case 'all':
        return true;
      default:
        return hasUpcoming(event, now);
    }
  });
}

/** Extract a YouTube video id from watch, youtu.be, embed and shorts URLs, or a bare id. */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') return valid(url.pathname.slice(1));
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') return valid(url.searchParams.get('v') ?? '');
      const m = url.pathname.match(/^\/(embed|shorts|v|live)\/([A-Za-z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {
    return null;
  }
  return null;
}
function valid(id: string) {
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

export function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
export function focalStyle(asset: { focal_x: number; focal_y: number } | null | undefined) {
  return asset ? { objectPosition: `${Math.round(asset.focal_x * 100)}% ${Math.round(asset.focal_y * 100)}%` } : undefined;
}

/** Weekday label for a YYYY-MM-DD key (calendar day in the editorial time zone). */
export function weekdayOfDay(key: string, locale: Locale) {
  const [y, m, d] = key.split('-').map(Number);
  return weekdayShort[locale][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
