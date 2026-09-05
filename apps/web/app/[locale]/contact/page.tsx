import type { Metadata } from 'next';
import { copy, localeOf } from '@/lib/i18n';
import { content, isDemo, translated, txs } from '@/lib/content';
import ContactForm from '@/components/site/ContactForm';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = localeOf((await params).locale);
  const page = await content.page('contact');
  const tr = page ? translated(page, locale) : null;
  return { title: tr?.seo_title || copy[locale].contact, description: tr?.seo_description };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = localeOf((await params).locale);
  const t = copy[locale];
  const [page, settings, venues] = await Promise.all([content.page('contact'), content.settings(), content.venues()]);
  const tr = page ? translated(page, locale) : { title: t.contact, subtitle: '', body: '', seo_title: '', seo_description: '' };
  const venue = venues[0];
  const email = settings.site.contact_email || venue?.email;
  const phone = settings.site.phone || venue?.phone;
  return (
    <main id="main">
      <header className="page-head wrap-wide">
        <p className="eyebrow">
          <span className="dot" />
          {t.contact}
        </p>
        <h1>{tr.subtitle || t.contact}</h1>
        <div className="prose" dangerouslySetInnerHTML={{ __html: tr.body || `<p>${t.contactIntro}</p>` }} />
      </header>
      <div className="wrap-wide contact-grid">
        <div>
          <div className="contact-aside">
            <h3>{t.email}</h3>
            {email ? <p><a href={`mailto:${email}`}>{email}</a></p> : <p>{t.contactSoon}</p>}
          </div>
          {phone && (
            <div className="contact-aside">
              <h3>{t.phone}</h3>
              <p><a href={`tel:${phone.replace(/\s+/g, '')}`}>{phone}</a></p>
            </div>
          )}
          {venue && (
            <div className="contact-aside">
              <h3>{t.address}</h3>
              <p>
                {txs(venue.name, locale)}
                <br />
                {txs(venue.address, locale)}
              </p>
            </div>
          )}
          <div className="contact-aside">
            <h3>{t.hours}</h3>
            <p>{txs(venue?.hours, locale)}</p>
          </div>
        </div>
        <ContactForm locale={locale} categories={settings.contact.categories} demo={isDemo} />
      </div>
    </main>
  );
}
