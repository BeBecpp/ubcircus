import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { copy, localeOf, locales } from '@/lib/i18n';
import { content, contentMode, fmtDay, fmtMonth, fmtTime, fmtWeekday, hasUpcoming, isPast, nextSession, sessionRange, stripHtml, translated, txs, type Event, type Session } from '@/lib/content';
import Artwork from '@/components/ui/Artwork';
import VideoPlayer from '@/components/site/VideoPlayer';
import EventGallery from '@/components/events/EventGallery';
import { VenueMap } from '@/components/home/PlanYourVisit';

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  if (contentMode !== 'demo') return [];
  const events = await content.events({ range: 'all' });
  return locales.flatMap((locale) => events.map((e) => ({ locale, slug: e.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = localeOf(raw);
  const event = await content.event(slug);
  if (!event) return {};
  const tr = translated(event, locale);
  return {
    title: tr.seo_title || tr.title,
    description: tr.seo_description || tr.excerpt || stripHtml(tr.description).slice(0, 160),
    openGraph: { title: tr.title, description: tr.excerpt, images: event.hero ? [event.hero.url] : event.poster ? [event.poster.url] : undefined, type: 'website' },
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `/${l}/events/${slug}`])) },
  };
}

function statusLabel(session: Session, t: (typeof copy)['en'], past: boolean) {
  if (past) return t.pastSession;
  if (session.status === 'sold_out') return t.soldOut;
  if (session.status === 'cancelled') return t.cancelled;
  return t.scheduled;
}

export default async function EventPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale = localeOf(raw);
  const t = copy[locale];
  const event = await content.event(slug);
  if (!event) notFound();
  const now = new Date();
  const tr = translated(event, locale);
  const next = nextSession(event, now);
  const range = sessionRange(event);
  const sessions = [...event.sessions].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const upcoming = hasUpcoming(event, now);
  const all = await content.events({ range: 'all' });
  const related = all.filter((e) => e.id !== event.id && (e.category?.id === event.category?.id || hasUpcoming(e, now))).slice(0, 3);
  const bookable = (s: Session) => !isPast(s, now) && s.status === 'scheduled' && !!s.ticket?.url && !event.sample;
  const credits = txs(event.credits, locale);
  const venue = event.venue;

  const bookingButton = (s: Session | null, full = true) => {
    if (!s) return <span className={`btn ${full ? '' : ''}`} aria-disabled="true">{t.bookingSoon}</span>;
    if (bookable(s))
      return (
        <a className="btn btn-red" href={s.ticket!.url!} target="_blank" rel="noopener noreferrer">
          {s.ticket?.label || t.book}
          <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
        </a>
      );
    return (
      <a className="btn" href="#sessions">
        {t.sessions}
        <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
      </a>
    );
  };

  return (
    <main id="main">
      <section className="event-hero">
        <Artwork asset={event.hero ?? event.poster} locale={locale} ratio="none" priority sizes="100vw" alt="" />
        <div className="event-hero-inner wrap-wide">
          <p className="eyebrow">
            {range && (
              <span>
                <b>{fmtDay(range.first.starts_at)} {fmtMonth(range.first.starts_at, locale)}</b>
                {event.sessions.length > 1 && <> → <b>{fmtDay(range.last.starts_at)} {fmtMonth(range.last.starts_at, locale)}</b></>}
              </span>
            )}
            {event.category && <span>{txs(event.category.labels, locale)}</span>}
            {venue && <span>{txs(venue.name, locale)}</span>}
            {event.sample && <span className="pill pill-brass"><i />{t.sampleShort}</span>}
          </p>
          <h1>{tr.title}</h1>
          {tr.subtitle && <p className="subline">{tr.subtitle}</p>}
          <div className="actions">
            {bookingButton(next)}
            <Link className="btn btn-ghost" href={`/${locale}/events`}>
              <ArrowLeft strokeWidth={1.5} aria-hidden="true" />
              {t.backToEvents}
            </Link>
          </div>
        </div>
      </section>

      <div className="wrap-wide event-body">
        <div className="event-main">
          <section aria-labelledby="intro">
            <div className="facts">
              <div>
                <small>{t.duration}</small>
                {event.duration_minutes ? `${event.duration_minutes} ${t.minutes}` : '—'}
              </div>
              <div>
                <small>{t.audience}</small>
                {tr.audience || '—'}
              </div>
              <div>
                <small>{t.sessions}</small>
                {event.sessions.length}
              </div>
            </div>
            {tr.excerpt && <p className="prose lede" style={{ fontFamily: 'var(--display)', fontSize: 'clamp(22px, 2.4vw, 32px)', lineHeight: 1.3, letterSpacing: '-0.01em', maxWidth: '30ch' }}>{tr.excerpt}</p>}
          </section>
          <section aria-labelledby="description-h">
            <h2 id="description-h">{t.description}</h2>
            <div className="prose" dangerouslySetInnerHTML={{ __html: tr.description }} />
          </section>
          <section aria-labelledby="sessions-h" id="sessions">
            <h2 id="sessions-h">{t.sessions}</h2>
            <div className="session-list">
              {sessions.map((s) => {
                const past = isPast(s, now);
                return (
                  <div key={s.id} className={`session-row ${past ? 'past' : ''}`}>
                    <div className="d">
                      {fmtWeekday(s.starts_at, locale)} {fmtDay(s.starts_at)} {fmtMonth(s.starts_at, locale)}
                      <small>{new Date(s.starts_at).getUTCFullYear()}</small>
                    </div>
                    <div className="t">{fmtTime(s.starts_at)}</div>
                    <div className={`s status-${past ? 'past' : s.status}`}>{statusLabel(s, t, past)}</div>
                    <div>
                      {bookable(s) ? (
                        <a className="buy" href={s.ticket!.url!} target="_blank" rel="noopener noreferrer">
                          {s.ticket?.label || t.book}
                          <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="buy disabled">{past ? t.pastSession : s.status === 'scheduled' ? (event.sample ? t.sampleBooking : t.bookingSoon) : statusLabel(s, t, false)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {event.sample && <p className="sample-note">{t.sample}</p>}
          </section>
          {event.video && (
            <section aria-labelledby="trailer-h">
              <h2 id="trailer-h">{t.trailer}</h2>
              <VideoPlayer video={event.video} locale={locale} />
            </section>
          )}
          {event.gallery.length > 0 && (
            <section aria-labelledby="gallery-h">
              <h2 id="gallery-h">{t.gallery}</h2>
              <EventGallery items={event.gallery} locale={locale} />
            </section>
          )}
          {credits && (
            <section aria-labelledby="credits-h">
              <h2 id="credits-h">{t.credits}</h2>
              <div className="prose" dangerouslySetInnerHTML={{ __html: credits }} />
            </section>
          )}
          {venue && (
            <section aria-labelledby="visit-h">
              <h2 id="visit-h">{t.visitInfo}</h2>
              <div className="visit-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="visit-cell">
                  <h4>{t.address}</h4>
                  <p>
                    {txs(venue.name, locale)}
                    <br />
                    {txs(venue.address, locale)}
                  </p>
                  {!venue.verified && (
                    <span className="warn">
                      <AlertTriangle strokeWidth={1.5} aria-hidden="true" />
                      {t.unverified}
                    </span>
                  )}
                  <h4 style={{ marginTop: 22 }}>{t.accessibility}</h4>
                  <p>{txs(venue.accessibility, locale)}</p>
                </div>
                <VenueMap venue={venue} locale={locale} />
              </div>
            </section>
          )}
          {related.length > 0 && (
            <section aria-labelledby="related-h">
              <h2 id="related-h">{t.related}</h2>
              <div className="related-list">
                {related.map((e: Event) => {
                  const rtr = translated(e, locale);
                  const n = nextSession(e, now);
                  return (
                    <Link key={e.id} href={`/${locale}/events/${e.slug}`}>
                      <Artwork asset={e.poster} locale={locale} ratio="3x4" sizes="(max-width: 767px) 50vw, 20vw" alt={rtr.title} />
                      <h3>{rtr.title}</h3>
                      <span>{n ? `${fmtDay(n.starts_at)} ${fmtMonth(n.starts_at, locale)}` : t.pastSession}{e.category ? ` · ${txs(e.category.labels, locale)}` : ''}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="booking-rail" aria-label={t.tickets}>
          <h3>{t.tickets}</h3>
          <div className="next">
            {next ? (
              <>
                {fmtWeekday(next.starts_at, locale)} {fmtDay(next.starts_at)} {fmtMonth(next.starts_at, locale)} · {fmtTime(next.starts_at)}
                <small>{t.next}</small>
              </>
            ) : (
              <>
                —<small>{upcoming ? t.bookingSoon : t.pastSession}</small>
              </>
            )}
          </div>
          <ul>
            {sessions.filter((s) => !isPast(s, now)).slice(0, 6).map((s) => (
              <li key={s.id}>
                <span>
                  {fmtDay(s.starts_at)} {fmtMonth(s.starts_at, locale)} · {fmtTime(s.starts_at)}
                </span>
                <span className={`status-${s.status}`}>{statusLabel(s, t, false)}</span>
              </li>
            ))}
          </ul>
          {bookingButton(next)}
          <p className="note">
            {event.sample ? t.sampleBooking : venue ? txs(venue.notes, locale) : ''}
          </p>
        </aside>
      </div>

      <div className="mobile-cta">
        <div className="info">
          {next ? (
            <>
              <b>{tr.title}</b>
              {fmtDay(next.starts_at)} {fmtMonth(next.starts_at, locale)} · {fmtTime(next.starts_at)}
            </>
          ) : (
            <b>{tr.title}</b>
          )}
        </div>
        {bookingButton(next, false)}
      </div>
    </main>
  );
}
