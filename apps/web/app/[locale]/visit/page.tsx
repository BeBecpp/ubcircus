import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { copy, localeOf } from '@/lib/i18n';
import { content, translated, txs } from '@/lib/content';
import Artwork from '@/components/ui/Artwork';
import { VenueMap } from '@/components/home/PlanYourVisit';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = localeOf((await params).locale);
  const page = await content.page('visit');
  const tr = page ? translated(page, locale) : null;
  return { title: tr?.seo_title || copy[locale].visit, description: tr?.seo_description };
}

export default async function VisitPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = localeOf((await params).locale);
  const t = copy[locale];
  const [page, venues, settings, media] = await Promise.all([content.page('visit'), content.venues(), content.settings(), content.media()]);
  const venue = venues[0];
  const tr = page ? translated(page, locale) : { title: t.visit, subtitle: t.planVisit, body: '', seo_title: '', seo_description: '' };
  const image = media.find((m) => m.category === 'photography') ?? media[0] ?? null;
  const email = settings.site.contact_email || venue?.email;
  const phone = settings.site.phone || venue?.phone;
  const warn = venue && !venue.verified && (
    <span className="warn">
      <AlertTriangle strokeWidth={1.5} aria-hidden="true" />
      {t.unverified}
    </span>
  );
  return (
    <main id="main">
      <header className="page-head wrap-wide">
        <div className="visit-hero">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              {t.visit}
            </p>
            <h1>{tr.subtitle || t.planVisit}</h1>
            <div className="prose" style={{ marginTop: 22 }} dangerouslySetInnerHTML={{ __html: tr.body }} />
          </div>
          <Artwork asset={image} locale={locale} ratio="4x3" priority sizes="(max-width: 767px) 100vw, 50vw" />
        </div>
      </header>
      {venue && (
        <section className="wrap-wide" style={{ paddingBottom: 'clamp(56px, 7vw, 110px)' }}>
          <div className="visit-details">
            <div>
              <div className="visit-detail">
                <h3>{t.address}</h3>
                <div>
                  <p>
                    <strong style={{ fontWeight: 500 }}>{txs(venue.name, locale)}</strong>
                    <br />
                    {txs(venue.address, locale)}
                  </p>
                  {warn}
                </div>
              </div>
              <div className="visit-detail">
                <h3>{t.directions}</h3>
                <p>{txs(venue.directions, locale)}</p>
              </div>
              <div className="visit-detail">
                <h3>{t.hours}</h3>
                <p>{txs(venue.hours, locale)}</p>
              </div>
              <div className="visit-detail">
                <h3>{t.accessibility}</h3>
                <p>{txs(venue.accessibility, locale)}</p>
              </div>
              <div className="visit-detail">
                <h3>{t.notes}</h3>
                <p>{txs(venue.notes, locale)}</p>
              </div>
              <div className="visit-detail">
                <h3>{t.contact}</h3>
                <div className="visit-contact">
                  {email ? <a href={`mailto:${email}`}>{email}</a> : <p style={{ color: 'var(--dim)' }}>{t.contactSoon}</p>}
                  {phone && <a href={`tel:${phone.replace(/\s+/g, '')}`}>{phone}</a>}
                  <Link className="link-arrow" href={`/${locale}/contact`} style={{ marginTop: 14 }}>
                    {t.contact}
                    <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
            <div style={{ position: 'sticky', top: 110, alignSelf: 'start', display: 'grid', gap: 24 }}>
              <VenueMap venue={venue} locale={locale} className="" />
              <Link className="btn btn-red" href={`/${locale}/events`} style={{ justifySelf: 'start' }}>
                {t.tickets}
                <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
