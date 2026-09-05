import { describe, expect, it } from 'vitest';
import { dayKey, filterEvents, fmtDateLine, fmtTime, monthKey, nextSession, parseYouTubeId, shiftMonth, sortByNextSession, tx, translated, upcomingSessions } from '@/lib/content/select';
import { renderBody } from '@/lib/content/render';
import { demoProvider } from '@/lib/content/demo';
import type { Event, MediaAsset } from '@/lib/content/types';

const NOW = new Date('2026-09-05T09:00:00+08:00');

describe('translation fallback', () => {
  it('falls back to Mongolian, then the first available locale', () => {
    expect(tx({ mn: 'МН', en: 'EN' }, 'tr')).toBe('МН');
    expect(tx({ en: 'EN' }, 'mn')).toBe('EN');
    expect(tx({}, 'en')).toBeUndefined();
    expect(translated({ translations: { en: { title: 'T' } } }, 'mn').title).toBe('T');
  });
});

describe('editorial time zone', () => {
  it('formats in Asia/Ulaanbaatar regardless of instant offset', () => {
    const utc = '2026-09-12T11:00:00Z'; // 19:00 in Ulaanbaatar
    expect(fmtTime(utc)).toBe('19:00');
    expect(dayKey(utc)).toBe('2026-09-12');
    expect(monthKey('2026-09-30T17:30:00Z')).toBe('2026-10'); // crosses midnight in UB
    expect(fmtDateLine('2026-09-12T11:00:00Z', 'en')).toBe('SAT 12 SEP');
    expect(fmtDateLine('2026-09-12T11:00:00Z', 'mn')).toBe('БЯ 12 9-р сар');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
});

describe('youtube ids', () => {
  it('accepts every common url shape and rejects the rest', () => {
    for (const url of ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=2s', 'https://youtube.com/embed/dQw4w9WgXcQ', 'https://m.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ']) expect(parseYouTubeId(url)).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://vimeo.com/1')).toBeNull();
    expect(parseYouTubeId('not a url')).toBeNull();
  });
});

describe('demo provider + filters', () => {
  it('exposes sessions per production and filters by week, month, day and category', async () => {
    const events = await demoProvider.events({ range: 'all' });
    expect(events.length).toBe(6);
    const ring = events.find((e) => e.slug === 'the-ring')!;
    expect(ring.sessions.length).toBe(5);
    expect(nextSession(ring, NOW)?.starts_at).toBe('2026-09-09T19:00:00+08:00');
    expect(filterEvents(events, { range: 'week' }, NOW).map((e) => e.slug)).toEqual(['the-ring']);
    expect(filterEvents(events, { range: 'past' }, NOW).map((e) => e.slug)).toEqual(['night-study']);
    expect(filterEvents(events, { category: 'family' }, NOW).map((e) => e.slug)).toEqual(['red-thread']);
    expect(filterEvents(events, { date: '2026-09-12' }, NOW).map((e) => e.slug)).toEqual(['the-ring']);
    expect(filterEvents(events, { month: '2026-11' }, NOW).map((e) => e.slug)).toEqual(['balance']);
    const sorted = sortByNextSession(events, NOW).map((e) => e.slug);
    expect(sorted[0]).toBe('the-ring');
    expect(sorted[sorted.length - 1]).toBe('night-study');
    expect(upcomingSessions(events, NOW)[0].event.slug).toBe('the-ring');
  });
  it('composes the homepage with distinct next-on-stage productions', async () => {
    const home = await demoProvider.homepage();
    const ids = home.next_on_stage.map((p) => p.event.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(home.hero.events.length).toBe(6);
    expect(home.featured.length).toBe(5);
    expect(home.visit?.verified).toBe(false);
    expect(home.video?.youtube_id).toBeNull();
  });
  it('never exposes draft content', async () => {
    const page = await demoProvider.page('does-not-exist');
    expect(page).toBeNull();
    const events = (await demoProvider.events({ range: 'all' })) as Event[];
    expect(events.every((e) => e.status === 'published')).toBe(true);
  });
});

describe('renderBody', () => {
  it('resolves media figures and escapes attributes', () => {
    const asset = { id: 'm1', url: '/placeholders/stage-01.svg', alt: { en: 'Ring "floor"' }, width: 1600, height: 900 } as unknown as MediaAsset;
    const html = renderBody('<p>a</p><figure data-media="m1"><figcaption>c</figcaption></figure><figure data-media="missing"></figure>', new Map([['m1', asset]]), 'en');
    expect(html).toContain('<img src="/placeholders/stage-01.svg" alt="Ring &quot;floor&quot;"');
    expect(html).not.toContain('missing');
  });
});
