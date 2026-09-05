import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { copy, href, type Locale } from '@/lib/i18n';
import { fmtDay, fmtMonth, fmtTime, fmtWeekday, translated, txs, type Performance } from '@/lib/content';
import Reveal from '@/components/ui/Reveal';

export default function NextOnStage({ locale, performances, demo }: { locale: Locale; performances: Performance[]; demo: boolean }) {
  const t = copy[locale];
  return (
    <section className="next-stage wrap-wide" id="next" aria-labelledby="next-title">
      <Reveal as="hr" className="hero-seam" threshold={0.9} />
      <div className="section-head" style={{ borderTop: 0 }}>
        <div className="kicker" id="next-title">
          <i aria-hidden="true" />
          {t.next}
        </div>
        <Link className="aside link-arrow" href={href(locale, '/calendar')}>
          {t.calendar}
          <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </div>
      {performances.length === 0 ? (
        <div className="empty">
          <p>{t.quiet}</p>
        </div>
      ) : (
        <ol>
          {performances.map(({ session, event }) => {
            const tr = translated(event, locale);
            const statusKey = session.status === 'sold_out' ? 'soldOut' : session.status;
            return (
              <li key={session.id}>
                <Link className="next-row" href={href(locale, `/events/${event.slug}`)}>
                  <div className="next-date">
                    <b>{fmtDay(session.starts_at)}</b>
                    <small>
                      {fmtMonth(session.starts_at, locale)}
                      <br />
                      {fmtWeekday(session.starts_at, locale)}
                    </small>
                  </div>
                  <div className="next-time">
                    {fmtTime(session.starts_at)}
                    <small>ULAANBAATAR</small>
                  </div>
                  <div className="next-name">
                    <h3>{tr.title}</h3>
                    <span>{tr.subtitle}</span>
                  </div>
                  <span className="next-venue">{txs(event.venue?.name, locale)}</span>
                  <span className={`next-status status-${session.status}`}>{t[statusKey as 'scheduled' | 'soldOut' | 'cancelled']}</span>
                  <span className="circle" aria-hidden="true">
                    <ArrowUpRight strokeWidth={1.5} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
      {demo && <p className="sample-note">{t.sample}</p>}
    </section>
  );
}
