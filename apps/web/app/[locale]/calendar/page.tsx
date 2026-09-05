import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { copy, localeOf, monthLong } from '@/lib/i18n';
import { content, dayKey, fmtDay, fmtMonth, fmtTime, fmtWeekday, isPast, isValidMonthKey, monthKey, sessionsOf, shiftMonth, translated, txs, type Performance } from '@/lib/content';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: copy[localeOf((await params).locale)].calendarTitle };
}

export default async function CalendarPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ month?: string }> }) {
  const locale = localeOf((await params).locale);
  const t = copy[locale];
  const { month: rawMonth } = await searchParams;
  const now = new Date();
  const current = monthKey(now.toISOString());
  const month = isValidMonthKey(rawMonth) ? rawMonth : current;
  const [y, m] = month.split('-').map(Number);
  const events = await content.events({ range: 'all' });
  const all = sessionsOf(events);
  const inMonth = all.filter((p) => monthKey(p.session.starts_at) === month);
  const monthsWithSessions = [...new Set(all.map((p) => monthKey(p.session.starts_at)))].sort();
  const byDay = new Map<string, Performance[]>();
  for (const p of inMonth) {
    const key = dayKey(p.session.starts_at);
    byDay.set(key, [...(byDay.get(key) ?? []), p]);
  }
  const todayKey = dayKey(now.toISOString());
  const statusText = (p: Performance) => (isPast(p.session, now) ? t.pastSession : p.session.status === 'sold_out' ? t.soldOut : p.session.status === 'cancelled' ? t.cancelled : t.scheduled);

  return (
    <main id="main">
      <header className="page-head wrap-wide">
        <div className="page-head-split">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              {t.calendarTitle} · {y}
            </p>
            <h1>{monthLong[locale][m - 1]}</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link className="circle" href={`?month=${shiftMonth(month, -1)}`} aria-label={t.previous} scroll={false}>
              <ChevronLeft strokeWidth={1.5} />
            </Link>
            <Link className="circle" href={`?month=${shiftMonth(month, 1)}`} aria-label={t.nextItem} scroll={false}>
              <ChevronRight strokeWidth={1.5} />
            </Link>
          </div>
        </div>
        {monthsWithSessions.length > 0 && (
          <nav className="cal-months" aria-label={t.month} style={{ marginTop: 32 }}>
            {monthsWithSessions.map((key) => {
              const [ky, km] = key.split('-').map(Number);
              return (
                <Link key={key} href={`?month=${key}`} aria-current={key === month ? 'true' : undefined} scroll={false}>
                  {monthLong[locale][km - 1]} {ky !== y ? ky : ''}
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      <section className="wrap-wide cal" style={{ marginBottom: 'clamp(56px, 7vw, 110px)' }}>
        {byDay.size === 0 ? (
          <div className="empty" style={{ marginTop: 40 }}>
            <p>{t.noPerformances}</p>
            <small>
              <Link className="link-arrow" href={`?month=${current}`}>{t.today}<ArrowUpRight strokeWidth={1.5} aria-hidden="true" /></Link>
            </small>
          </div>
        ) : (
          [...byDay.entries()].map(([key, list]) => {
            const first = list[0].session.starts_at;
            const past = key < todayKey;
            return (
              <div key={key} className={`cal-day ${past ? 'past' : ''}`} id={`d-${key}`}>
                <div className="d">
                  {fmtDay(first)}
                  <small>
                    {fmtWeekday(first, locale)} · {fmtMonth(first, locale)}
                    {key === todayKey ? ` · ${t.today}` : ''}
                  </small>
                </div>
                <div>
                  {list.map((p) => {
                    const tr = translated(p.event, locale);
                    return (
                      <Link key={p.session.id} className="cal-item" href={`/${locale}/events/${p.event.slug}`}>
                        <span className="t">{fmtTime(p.session.starts_at)}</span>
                        <div>
                          <h3>{tr.title}</h3>
                          <span style={{ color: 'var(--muted)' }}>{txs(p.event.venue?.name, locale)}{p.event.category ? ` · ${txs(p.event.category.labels, locale)}` : ''}</span>
                        </div>
                        <span className={`status-${isPast(p.session, now) ? 'past' : p.session.status}`}>{statusText(p)}</span>
                        <span className="circle" aria-hidden="true"><ArrowUpRight strokeWidth={1.5} /></span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
