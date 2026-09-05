import { Suspense } from 'react';
import type { Metadata } from 'next';
import { copy, localeOf } from '@/lib/i18n';
import { content, isDemo } from '@/lib/content';
import ArchiveGallery from '@/components/media/ArchiveGallery';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { title: copy[localeOf((await params).locale)].media };
}

export default async function MediaPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = localeOf((await params).locale);
  const t = copy[locale];
  const [galleries, media, videos] = await Promise.all([content.galleries(), content.media(), content.videos()]);
  return (
    <main id="main">
      <header className="page-head wrap-wide">
        <div className="page-head-split">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              {t.media} · {media.length}
            </p>
            <h1>{t.mediaTitle}</h1>
          </div>
          <p>{t.mediaIntro}{isDemo ? ` ${t.sample}.` : ''}</p>
        </div>
      </header>
      <Suspense fallback={null}>
        <ArchiveGallery locale={locale} galleries={galleries} media={media} videos={videos} />
      </Suspense>
    </main>
  );
}
