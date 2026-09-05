import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { copy, localeOf, locales } from '@/lib/i18n';
import { content, contentMode, fmtFullDate, stripHtml, translated, txs } from '@/lib/content';
import { renderBody } from '@/lib/content/render';
import Artwork from '@/components/ui/Artwork';
import ShareButtons from '@/components/site/ShareButtons';

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  if (contentMode !== 'demo') return [];
  const articles = await content.articles();
  return locales.flatMap((locale) => articles.map((a) => ({ locale, slug: a.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = localeOf(raw);
  const article = await content.article(slug);
  if (!article) return {};
  const tr = translated(article, locale);
  return {
    title: tr.seo_title || tr.title,
    description: tr.seo_description || tr.excerpt || stripHtml(tr.body).slice(0, 160),
    openGraph: { title: tr.title, description: tr.excerpt, type: 'article', publishedTime: article.published_at ?? undefined, images: article.lead_image ? [article.lead_image.url] : undefined },
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `/${l}/stories/${slug}`])) },
  };
}

export default async function StoryPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale = localeOf(raw);
  const t = copy[locale];
  const article = await content.article(slug);
  if (!article) notFound();
  const [media, others] = await Promise.all([content.media(), content.articles()]);
  const tr = translated(article, locale);
  const body = renderBody(tr.body, new Map(media.map((m) => [m.id, m])), locale);
  const related = others.filter((a) => a.id !== article.id).slice(0, 3);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: tr.title,
    description: tr.excerpt,
    datePublished: article.published_at,
    inLanguage: locale,
    image: article.lead_image?.url,
    publisher: { '@type': 'Organization', name: 'UB CIRCUS' },
  };
  return (
    <main id="main">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="wrap-wide article-head">
        <div className="story-kicker">
          {article.category && <b>{txs(article.category.labels, locale)}</b>}
          {article.published_at && <span>{fmtFullDate(article.published_at, locale)}</span>}
          {article.sample && <span>{t.sampleShort}</span>}
        </div>
        <h1>{tr.title}</h1>
        {tr.subtitle && <p className="dek">{tr.subtitle}</p>}
      </header>
      {article.lead_image && (
        <figure className="article-lead">
          <Artwork asset={article.lead_image} locale={locale} ratio="21x9" priority sizes="100vw" />
          <figcaption>
            <span>{txs(article.lead_image.caption, locale) || txs(article.lead_image.alt, locale)}</span>
            <span>{article.lead_image.credit}</span>
          </figcaption>
        </figure>
      )}
      <div className="wrap-wide article-body">
        <aside className="article-side">
          {article.published_at && (
            <div>
              {t.published}
              <b>{fmtFullDate(article.published_at, locale)}</b>
            </div>
          )}
          {article.reading_minutes ? (
            <div style={{ marginTop: 14 }}>
              {t.readingTime}
              <b>{article.reading_minutes} {t.minutes}</b>
            </div>
          ) : null}
          <ShareButtons locale={locale} title={tr.title} />
        </aside>
        <article className="prose" dangerouslySetInnerHTML={{ __html: body }} />
        <div />
      </div>
      {related.length > 0 && (
        <section className="wrap-wide" style={{ paddingBottom: 'clamp(56px, 7vw, 110px)' }} aria-labelledby="related-stories">
          <div className="section-head">
            <div className="kicker" id="related-stories">
              <i aria-hidden="true" />
              {t.relatedStories}
            </div>
            <Link className="aside link-arrow" href={`/${locale}/stories`}>{t.allStories}</Link>
          </div>
          <div className="related-list">
            {related.map((a) => {
              const rtr = translated(a, locale);
              return (
                <Link key={a.id} href={`/${locale}/stories/${a.slug}`}>
                  <Artwork asset={a.lead_image} locale={locale} ratio="4x3" sizes="(max-width: 767px) 50vw, 30vw" alt={rtr.title} />
                  <h3>{rtr.title}</h3>
                  <span>{a.category ? txs(a.category.labels, locale) : ''}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
