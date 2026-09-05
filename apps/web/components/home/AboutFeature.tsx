import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { copy, href, type Locale } from '@/lib/i18n';
import { txs, type AboutFeature as AboutFeatureData, type MediaAsset } from '@/lib/content';
import Artwork from '@/components/ui/Artwork';

export default function AboutFeature({ locale, about, fragments }: { locale: Locale; about: AboutFeatureData; fragments: MediaAsset[] }) {
  const t = copy[locale];
  return (
    <section className="about-feature" aria-labelledby="about-title">
      <div className="wrap-wide about-grid">
        <div>
          <Artwork asset={about.image} locale={locale} ratio="4x3" sizes="(max-width: 1024px) 100vw, 55vw" />
          {fragments.length > 0 && (
            <div className="about-fragments" aria-label={t.archiveFragments}>
              {fragments.slice(0, 3).map((f) => (
                <Artwork key={f.id} asset={f} locale={locale} ratio="4x3" sizes="18vw" />
              ))}
            </div>
          )}
        </div>
        <div className="about-text">
          <div className="about-year">
            <small>{txs(about.year_caption, locale) || t.year}</small>
            {about.year_label || '—'}
          </div>
          <h3 id="about-title">{txs(about.title, locale)}</h3>
          <p>{txs(about.body, locale)}</p>
          <Link className="btn" href={href(locale, about.href || '/about')}>
            {t.aboutTitle}
            <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
