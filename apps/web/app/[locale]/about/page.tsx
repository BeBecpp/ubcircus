import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { copy, localeOf, localeNames, locales } from '@/lib/i18n';
import { content, translated, txs } from '@/lib/content';
import Artwork from '@/components/ui/Artwork';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = localeOf((await params).locale);
  const page = await content.page('about');
  const tr = page ? translated(page, locale) : null;
  return { title: tr?.seo_title || copy[locale].about, description: tr?.seo_description };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = localeOf((await params).locale);
  const t = copy[locale];
  const [page, home, galleries] = await Promise.all([content.page('about'), content.homepage(), content.galleries()]);
  const tr = page ? translated(page, locale) : { title: t.about, subtitle: '', body: '', seo_title: '', seo_description: '' };
  const about = home.about;
  const fragments = galleries.flatMap((g) => g.items.map((i) => i.media)).filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i).slice(0, 6);
  return (
    <main id="main">
      <section className="about-hero wrap-wide">
        <div className="about-overline">
          <div className="about-year">
            <small>{txs(about?.year_caption, locale) || t.year}</small>
            {about?.year_label || '—'}
          </div>
          <h1>{tr.subtitle || tr.title}</h1>
        </div>
        <Artwork asset={about?.image ?? fragments[0] ?? null} locale={locale} ratio="21x9" priority sizes="100vw" />
      </section>
      <div className="wrap-wide about-body">
        <aside>
          <div>
            {t.institution}
            <b>UB CIRCUS · {txs(home.visit?.name, locale)}</b>
          </div>
          <div style={{ marginTop: 16 }}>
            {t.language}
            <b>{locales.map((l) => localeNames[l]).join(' · ')}</b>
          </div>
          <div style={{ marginTop: 16 }}>
            {t.history}
            <b>{t.historyPending}</b>
          </div>
        </aside>
        <div>
          <div className="prose" dangerouslySetInnerHTML={{ __html: tr.body }} />
          <div style={{ display: 'flex', gap: 14, marginTop: 40, flexWrap: 'wrap' }}>
            <Link className="btn" href={`/${locale}/visit`}>{t.planVisit}<ArrowUpRight strokeWidth={1.5} aria-hidden="true" /></Link>
            <Link className="btn btn-ghost" href={`/${locale}/stories`}>{t.stories}<ArrowUpRight strokeWidth={1.5} aria-hidden="true" /></Link>
          </div>
        </div>
      </div>
      {fragments.length > 0 && (
        <section className="wrap-wide" style={{ paddingBottom: 'clamp(56px, 7vw, 110px)' }} aria-labelledby="fragments">
          <div className="section-head">
            <div className="kicker" id="fragments"><i aria-hidden="true" />{t.archiveFragments}</div>
            <Link className="aside link-arrow" href={`/${locale}/media`}>{t.media}<ArrowUpRight strokeWidth={1.5} aria-hidden="true" /></Link>
          </div>
          <div className="timeline">
            {fragments.slice(0, 4).map((m, i) => (
              <div key={m.id} className="timeline-row">
                <div className="y">0{i + 1}</div>
                <p>{txs(m.caption, locale) || txs(m.alt, locale)}</p>
                <Artwork asset={m} locale={locale} ratio="16x9" sizes="300px" />
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
