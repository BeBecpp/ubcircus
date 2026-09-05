import Link from 'next/link';
import { copy, href, locales, localeNames, type Locale } from '@/lib/i18n';
import { txs, type NavigationItem, type SiteSettings } from '@/lib/content';

type Props = { locale: Locale; items: NavigationItem[]; settings: SiteSettings; demo: boolean };

export default function SiteFooter({ locale, items, settings, demo }: Props) {
  const t = copy[locale];
  const programme = items.filter((i) => ['/events', '/calendar'].includes(i.href));
  const institution = items.filter((i) => ['/stories', '/media', '/about'].includes(i.href));
  const visit = items.filter((i) => ['/visit', '/contact'].includes(i.href));
  const email = settings.site.contact_email;
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Link className="wordmark" href={href(locale)}>
            {settings.site.name}
            <span>{settings.site.wordmark_sub}</span>
          </Link>
          <p>{txs(settings.site.tagline, locale)}</p>
          <small>{t.ringAfterDark} · Ulaanbaatar, Mongolia</small>
        </div>
        <div className="footer-col">
          <h4>{t.performances}</h4>
          {programme.map((i) => (
            <Link key={i.id} href={href(locale, i.href)}>{txs(i.label, locale)}</Link>
          ))}
          <Link href={href(locale, '/events')}>{t.tickets}</Link>
        </div>
        <div className="footer-col">
          <h4>{t.institution}</h4>
          {institution.map((i) => (
            <Link key={i.id} href={href(locale, i.href)}>{txs(i.label, locale)}</Link>
          ))}
        </div>
        <div className="footer-col">
          <h4>{t.visit}</h4>
          {visit.map((i) => (
            <Link key={i.id} href={href(locale, i.href)}>{txs(i.label, locale)}</Link>
          ))}
          {email ? <a href={`mailto:${email}`}>{email}</a> : <span className="dimmed">{t.contactSoon}</span>}
          <span className="dimmed" style={{ marginTop: 14 }}>{t.language}</span>
          <span style={{ display: 'flex', gap: 14 }}>
            {locales.map((l) => (
              <Link key={l} lang={l} hrefLang={l} href={href(l)} aria-label={localeNames[l]} style={{ padding: 0, fontSize: 12, letterSpacing: '0.12em' }}>{l.toUpperCase()}</Link>
            ))}
          </span>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} {settings.site.name} · {t.rights}</span>
        {demo && <span>{t.sample}</span>}
        <Link href="/admin">{t.backstage}</Link>
      </div>
    </footer>
  );
}
