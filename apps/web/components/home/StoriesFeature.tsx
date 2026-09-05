import Link from 'next/link';
import { copy, href, type Locale } from '@/lib/i18n';
import { fmtDay, fmtMonth, fmtYear, translated, txs, type Article } from '@/lib/content';
import Artwork from '@/components/ui/Artwork';
import SectionHead from '@/components/ui/SectionHead';

/** Magazine composition: one dominant story, up to three supporting stories. */
export default function StoriesFeature({ locale, stories }: { locale: Locale; stories: Article[] }) {
  const t = copy[locale];
  if (!stories.length) return null;
  const [lead, ...rest] = stories;
  const leadTr = translated(lead, locale);
  const kicker = (a: Article) => (
    <div className="story-kicker">
      {a.category && <b>{txs(a.category.labels, locale)}</b>}
      {a.published_at && (
        <span>
          {fmtDay(a.published_at)} {fmtMonth(a.published_at, locale)} {fmtYear(a.published_at)}
        </span>
      )}
      {a.reading_minutes ? <span>{a.reading_minutes} {t.readingTime}</span> : null}
    </div>
  );
  return (
    <section className="stories wrap-wide" aria-labelledby="stories-title">
      <SectionHead kicker={t.stories} id="stories-title" title={t.storiesTitle} aside={{ href: href(locale, '/stories'), label: t.allStories }} />
      <div className="stories-grid">
        <Link className="story-lead" href={href(locale, `/stories/${lead.slug}`)}>
          <Artwork asset={lead.lead_image} locale={locale} ratio="none" sizes="(max-width: 1024px) 100vw, 58vw" alt={leadTr.title} />
          <div style={{ marginTop: 22 }}>{kicker(lead)}</div>
          <h3 style={{ marginTop: 14 }}>{leadTr.title}</h3>
          <p>{leadTr.excerpt}</p>
        </Link>
        <div className="story-secondary-list">
          {rest.slice(0, 3).map((a) => {
            const tr = translated(a, locale);
            return (
              <Link key={a.id} className="story-secondary" href={href(locale, `/stories/${a.slug}`)}>
                <div>
                  {kicker(a)}
                  <h3>{tr.title}</h3>
                  <p>{tr.excerpt}</p>
                </div>
                <Artwork asset={a.lead_image} locale={locale} ratio="3x4" sizes="120px" alt={tr.title} />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
