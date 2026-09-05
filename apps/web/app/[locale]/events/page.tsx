import { Suspense } from 'react';
import type { Metadata } from 'next';
import { copy, localeOf } from '@/lib/i18n';
import { content, isDemo } from '@/lib/content';
import WhatsOn from '@/components/home/WhatsOn';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = localeOf((await params).locale);
  return { title: copy[locale].performances };
}

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = localeOf((await params).locale);
  const t = copy[locale];
  const [events, categories] = await Promise.all([content.events({ range: 'all' }), content.categories('event')]);
  const nowIso = new Date().toISOString();
  return (
    <main id="main">
      <header className="page-head wrap-wide">
        <div className="page-head-split">
          <div>
            <p className="eyebrow">
              <span className="dot" />
              {t.programmeKicker} · {events.length}
            </p>
            <h1>{t.performances}</h1>
          </div>
          <p>{t.explore}</p>
        </div>
      </header>
      <Suspense fallback={null}>
        <WhatsOn locale={locale} events={events} categories={categories} nowIso={nowIso} showHead={false} showPast />
      </Suspense>
      {isDemo && (
        <div className="wrap-wide">
          <p className="sample-note" style={{ marginBottom: 60 }}>{t.sample}</p>
        </div>
      )}
    </main>
  );
}
