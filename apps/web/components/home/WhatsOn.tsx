'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { copy, href, monthLong, type Locale } from '@/lib/i18n';
import { daysInMonth, dayKey, filterEvents, fmtDay, fmtMonth, fmtWeekday, isValidDayKey, isValidMonthKey, monthKey, nextSession, sessionRange, shiftMonth, sortByNextSession, translated, txs, weekdayOfDay, type Category, type Event } from '@/lib/content';
import Artwork from '@/components/ui/Artwork';
import SectionHead from '@/components/ui/SectionHead';

type Props = { locale: Locale; events: Event[]; categories: Category[]; nowIso: string; title?: string; showHead?: boolean; showPast?: boolean; limit?: number; basePath?: string };

/**
 * Functional event discovery. Filter state lives in the URL:
 *   ?range=week|month   ?category=slug   ?month=YYYY-MM   ?date=YYYY-MM-DD
 */
export default function WhatsOn({ locale, events, categories, nowIso, showHead = true, showPast = false, limit, basePath }: Props) {
  const t = copy[locale];
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const range = (['week', 'month', 'past', 'all'].includes(sp.get('range') ?? '') ? sp.get('range') : 'all') as 'week' | 'month' | 'past' | 'all';
  const category = sp.get('category') ?? undefined;
  const date = isValidDayKey(sp.get('date') ?? undefined) ? sp.get('date')! : undefined;
  const monthParam = isValidMonthKey(sp.get('month') ?? undefined) ? sp.get('month')! : undefined;
  const railMonth = monthParam ?? (date ? date.slice(0, 7) : monthKey(nowIso));

  function setParams(patch: Record<string, string | undefined>) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '' || v === 'all') p.delete(k);
      else p.set(k, v);
    }
    const q = p.toString();
    router.replace(`${basePath ?? pathname}${q ? `?${q}` : ''}${basePath ? '' : '#whats-on'}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    const base = filterEvents(events, { range: date || monthParam ? 'all' : range, category, date, month: date ? undefined : monthParam }, now);
    const sorted = sortByNextSession(base, now);
    return limit ? sorted.slice(0, limit) : sorted;
  }, [events, range, category, date, monthParam, now, limit]);
  const dayHas = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) for (const s of e.sessions) set.add(dayKey(s.starts_at));
    return set;
  }, [events]);
  const [ry, rm] = railMonth.split('-').map(Number);
  const todayKey = dayKey(nowIso);
  const activeFilters = !!(category || date || monthParam || range !== 'all');

  const when = (event: Event) => {
    const next = nextSession(event, now);
    const r = sessionRange(event);
    if (!r) return null;
    const first = next ?? r.first;
    const sameMonth = fmtMonth(r.first.starts_at, locale) === fmtMonth(r.last.starts_at, locale);
    return (
      <span className="prog-when">
        <b>{fmtWeekday(first.starts_at, locale)} {fmtDay(first.starts_at)} {fmtMonth(first.starts_at, locale)}</b>
        {event.sessions.length > 1 && (
          <>
            <span aria-hidden="true">→</span>
            {fmtDay(r.last.starts_at)} {sameMonth ? '' : fmtMonth(r.last.starts_at, locale)}
          </>
        )}
      </span>
    );
  };

  return (
    <section className="whats-on wrap-wide" id="whats-on" aria-labelledby="whats-on-title">
      {showHead && <SectionHead kicker={t.programmeKicker} id="whats-on-title" title={t.whatsOn} aside={{ href: href(locale, '/calendar'), label: t.seeCalendar }} />}
      <div className="filters" role="group" aria-label={t.status}>
        {(showPast ? (['all', 'week', 'month', 'past'] as const) : (['all', 'week', 'month'] as const)).map((r) => (
          <button key={r} type="button" aria-pressed={range === r && !date && !monthParam} onClick={() => setParams({ range: r, date: undefined, month: undefined })}>
            {r === 'all' ? t.filterAll : r === 'week' ? t.thisWeek : r === 'month' ? t.thisMonth : t.past}
          </button>
        ))}
        <span className="sep" aria-hidden="true" />
        {categories.map((c) => (
          <button key={c.id} type="button" aria-pressed={category === c.slug} onClick={() => setParams({ category: category === c.slug ? undefined : c.slug })}>
            {txs(c.labels, locale)}
          </button>
        ))}
        {activeFilters && (
          <button type="button" onClick={() => setParams({ range: undefined, category: undefined, date: undefined, month: undefined })} style={{ marginLeft: 'auto', color: 'var(--brass)' }}>
            {t.clearFilters}
          </button>
        )}
      </div>

      <div className="date-rail">
        <div className="month">
          {monthLong[locale][rm - 1]}
          <small>{ry}</small>
          <div className="month-nav">
            <button type="button" aria-label={t.previous} onClick={() => setParams({ month: shiftMonth(railMonth, -1), date: undefined })}>
              <ChevronLeft strokeWidth={1.5} />
            </button>
            <button type="button" aria-label={t.nextItem} onClick={() => setParams({ month: shiftMonth(railMonth, 1), date: undefined })}>
              <ChevronRight strokeWidth={1.5} />
            </button>
          </div>
        </div>
        <div className="days" role="listbox" aria-label={t.date}>
          {Array.from({ length: daysInMonth(railMonth) }, (_, i) => {
            const key = `${railMonth}-${String(i + 1).padStart(2, '0')}`;
            const has = dayHas.has(key);
            return (
              <button
                key={key}
                type="button"
                role="option"
                aria-selected={date === key}
                aria-pressed={date === key}
                className={`day ${has ? 'has' : ''} ${key === todayKey ? 'today' : ''}`}
                onClick={() => setParams({ date: date === key ? undefined : key, month: railMonth })}
                disabled={!has && date !== key}
              >
                <small>{weekdayOfDay(key, locale)}</small>
                {i + 1}
                <i aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty" style={{ marginTop: 32 }}>
          <p>{t.noPerformances}</p>
          <small>
            <button type="button" className="link-arrow" onClick={() => setParams({ range: undefined, category: undefined, date: undefined, month: undefined })}>{t.clearFilters}</button>
          </small>
        </div>
      ) : (
        <div className="programme">
          {filtered.map((event, i) => {
            const tr = translated(event, locale);
            const link = href(locale, `/events/${event.slug}`);
            const cat = event.category ? <span className="prog-cat">{txs(event.category.labels, locale)}</span> : null;
            if (i === 0)
              return (
                <Link key={event.id} className="prog-feature" href={link}>
                  <Artwork asset={event.hero ?? event.poster} locale={locale} ratio="16x9" sizes="(max-width: 767px) 100vw, 60vw" alt={tr.title} />
                  <div>
                    {cat}
                    <h3>{tr.title}</h3>
                    {when(event)}
                    <p>{tr.excerpt}</p>
                    <span className="prog-sessions">{event.sessions.length} {t.sessions.toLowerCase()} · {txs(event.venue?.name, locale)}</span>
                  </div>
                </Link>
              );
            if (i === 2)
              return (
                <Link key={event.id} className="prog-landscape" href={link}>
                  <Artwork asset={event.hero ?? event.poster} locale={locale} ratio="4x3" sizes="(max-width: 767px) 100vw, 40vw" alt={tr.title} />
                  <div>
                    {cat}
                    <h3>{tr.title}</h3>
                    {when(event)}
                    <span className="prog-sessions">{event.sessions.length} {t.sessions.toLowerCase()}</span>
                  </div>
                </Link>
              );
            if (i < 6)
              return (
                <Link key={event.id} className="prog-portrait" href={link}>
                  <Artwork asset={event.poster} locale={locale} ratio="3x4" sizes="(max-width: 767px) 50vw, 30vw" alt={tr.title} />
                  {cat && <div style={{ marginTop: 14 }}>{cat}</div>}
                  <h3 style={cat ? { marginTop: 6 } : undefined}>{tr.title}</h3>
                  {when(event)}
                </Link>
              );
            return (
              <Link key={event.id} className="prog-row" href={link}>
                <div className="prog-when-cell">{when(event)}</div>
                <h3>{tr.title}</h3>
                {cat ?? <span />}
                <span className="circle" aria-hidden="true"><ArrowUpRight strokeWidth={1.5} /></span>
              </Link>
            );
          })}
        </div>
      )}
      <div className="programme-foot">
        <span className="meta">{filtered.length} {t.results}</span>
        <Link className="link-arrow" href={`${href(locale, '/events')}${sp.toString() ? `?${sp.toString()}` : ''}`}>
          {t.all}
          <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
