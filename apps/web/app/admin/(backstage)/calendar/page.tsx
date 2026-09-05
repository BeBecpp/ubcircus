import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { load } from '@/components/admin/Guarded';
import { titleOf } from '@/lib/admin/api';
import { daysInMonth, dayKey, fmtTime, isValidMonthKey, monthKey, shiftMonth, weekdayOfDay } from '@/lib/content/select';
import type { components } from '@/lib/api/schema';

type EventOut = components['schemas']['EventOut'];

export default async function AdminCalendar({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: raw } = await searchParams;
  const month = isValidMonthKey(raw) ? raw : monthKey(new Date().toISOString());
  const { data, error } = await load<EventOut[]>('events');
  if (error) return error;
  const [y, m] = month.split('-').map(Number);
  const days = daysInMonth(month);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0 = Sunday
  const lead = (first + 6) % 7; // Monday-first grid
  const byDay = new Map<string, { time: string; title: string; status: string; href: string; eventStatus: string }[]>();
  for (const e of data!) for (const s of e.sessions) {
    const key = dayKey(s.starts_at);
    if (!key.startsWith(month)) continue;
    byDay.set(key, [...(byDay.get(key) ?? []), { time: fmtTime(s.starts_at), title: titleOf(e), status: s.status, href: `/admin/events/${e.id}`, eventStatus: e.status }]);
  }
  const today = dayKey(new Date().toISOString());
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => i - lead + 1);
  const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
  return (
    <>
      <div className="bs-head">
        <div>
          <p className="eyebrow">Programme · Calendar</p>
          <h1>{monthName}</h1>
          <p>All sessions, including drafts (greyed). Click a session to open its production.</p>
        </div>
        <div className="bs-actions">
          <Link className="btn btn-sm btn-icon" href={`?month=${shiftMonth(month, -1)}`} aria-label="Previous month"><ChevronLeft strokeWidth={1.5} /></Link>
          <Link className="btn btn-sm" href={`?month=${monthKey(new Date().toISOString())}`}>Today</Link>
          <Link className="btn btn-sm btn-icon" href={`?month=${shiftMonth(month, 1)}`} aria-label="Next month"><ChevronRight strokeWidth={1.5} /></Link>
        </div>
      </div>
      <div className="cal-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          const inMonth = d >= 1 && d <= days;
          const key = inMonth ? `${month}-${String(d).padStart(2, '0')}` : '';
          const items = key ? byDay.get(key) ?? [] : [];
          return (
            <div key={i} className={`cal-cell ${inMonth ? '' : 'other'} ${key === today ? 'today' : ''}`}>
              {inMonth && <div className="d"><span>{d}</span><span>{weekdayOfDay(key, 'en')}</span></div>}
              {items.map((it, j) => (
                <Link key={j} className={`cal-chip ${it.status}`} href={it.href} style={it.eventStatus !== 'published' ? { opacity: 0.5 } : undefined} title={`${it.time} ${it.title} (${it.eventStatus})`}>
                  <b>{it.time}</b>{it.title}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
