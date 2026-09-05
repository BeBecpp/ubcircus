import type { Metadata } from 'next';
import Link from 'next/link';
import { copy, localeOf } from '@/lib/i18n';
import { content, fmtDay, fmtMonth, fmtYear, translated, txs, type Article } from '@/lib/content';
import Artwork from '@/components/ui/Artwork';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: copy[localeOf((await params).locale)].stories };
}

export default async function StoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = localeOf((await params).locale);
  const t = copy[locale];
  const articles = await content.articles();
  const kicker = (a: Article) => (
    <div className="story-kicker">
      {a.category && <b>{txs(a.category.labels, locale)}</b>}
      {a.published_at && <span>{fmtDay(a.published_at)} {fmtMonth(a.published_at, locale)} {fmtYear(a.published_at)}</span>}
      {a.reading_minutes ? <span>{a.reading_minutes} {t.readingTime}</span> : null}
    </div>
  );
  const [lead, ...rest] = articles;
  return (
    <main id="main">
      <header className="page-head wrap-wide">
        <p className="eyebrow">
          <span className="dot" />
          {t.stories}
        </p>
        <h1>{t.storiesTitle}</h1>
      </header>
      <section className="wrap-wide" style={{ paddingBottom: 'clamp(56px, 7vw, 110px)' }}>
        {!lead ? (
          <div className="empty">
            <p>{t.quietStories}</p>
          </div>
        ) : (
          <div className="stories-index">
            <Link className="si-lead" href={`/${locale}/stories/${lead.slug}`}>
              <Artwork asset={lead.lead_image} locale={locale} ratio="none" priority sizes="(max-width: 767px) 100vw, 60vw" alt={translated(lead, locale).title} />
              <div className="si-text">
                {kicker(lead)}
                <h2>{translated(lead, locale).title}</h2>
                <p>{translated(lead, locale).excerpt}</p>
              </div>
            </Link>
            {rest.map((a, i) => {
              const tr = translated(a, locale);
              const wide = i % 3 === 2;
              return (
                <Link key={a.id} className={`si-item ${wide ? 'wide' : ''}`} href={`/${locale}/stories/${a.slug}`}>
                  <Artwork asset={a.lead_image} locale={locale} ratio="none" sizes="(max-width: 767px) 100vw, 33vw" alt={tr.title} />
                  <div className="si-text" style={{ marginTop: wide ? 0 : 0 }}>
                    <div style={{ marginTop: 14 }}>{kicker(a)}</div>
                    <h2>{tr.title}</h2>
                    <p>{tr.excerpt}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
