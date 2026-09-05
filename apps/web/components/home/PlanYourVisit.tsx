import Link from 'next/link';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { copy, href, type Locale } from '@/lib/i18n';
import { txs, type Venue } from '@/lib/content';
import SectionHead from '@/components/ui/SectionHead';

export function VenueMap({ venue, locale, className = '' }: { venue: Venue; locale: Locale; className?: string }) {
  const t = copy[locale];
  const embed = venue.map_url && /^https:\/\/(www\.)?google\.com\/maps\/embed/.test(venue.map_url) ? venue.map_url : null;
  return (
    <div className={`visit-map ${embed ? 'has-map' : ''} ${className}`} aria-label={t.map}>
      {embed ? <iframe src={embed} title={`${t.map}: ${txs(venue.name, locale)}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <span>{t.mapSoon}</span>}
    </div>
  );
}

export default function PlanYourVisit({ locale, venue, email, phone }: { locale: Locale; venue: Venue; email: string; phone: string }) {
  const t = copy[locale];
  const unverified = !venue.verified && (
    <span className="warn">
      <AlertTriangle strokeWidth={1.5} aria-hidden="true" />
      {t.unverified}
    </span>
  );
  return (
    <section className="visit-block" aria-labelledby="visit-title">
      <div className="wrap-wide">
        <SectionHead kicker={t.visit} id="visit-title" title={t.planVisit} aside={{ href: href(locale, '/visit'), label: t.more }} />
        <div className="visit-grid">
          <div className="visit-cell">
            <h4>{t.address}</h4>
            <p>
              <strong style={{ fontWeight: 500 }}>{txs(venue.name, locale)}</strong>
              <br />
              {txs(venue.address, locale)}
            </p>
            {unverified}
          </div>
          <div className="visit-cell">
            <h4>{t.directions}</h4>
            <p>{txs(venue.directions, locale)}</p>
            <h4 style={{ marginTop: 26 }}>{t.hours}</h4>
            <p>{txs(venue.hours, locale)}</p>
          </div>
          <div className="visit-cell">
            <h4>{t.accessibility}</h4>
            <p>{txs(venue.accessibility, locale)}</p>
            <h4 style={{ marginTop: 26 }}>{t.contact}</h4>
            <div className="visit-contact">
              {email || venue.email ? <a href={`mailto:${email || venue.email}`}>{email || venue.email}</a> : <p style={{ color: 'var(--dim)' }}>{t.contactSoon}</p>}
              {(phone || venue.phone) && <a href={`tel:${(phone || venue.phone).replace(/\s+/g, '')}`}>{phone || venue.phone}</a>}
              <Link className="link-arrow" href={href(locale, '/contact')} style={{ marginTop: 14 }}>
                {t.contact}
                <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <VenueMap venue={venue} locale={locale} />
        </div>
      </div>
    </section>
  );
}
