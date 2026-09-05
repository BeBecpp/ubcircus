import { Suspense } from 'react';
import { copy, localeOf } from '@/lib/i18n';
import { content, isDemo } from '@/lib/content';
import PerformanceOrbitHero from '@/components/site/PerformanceOrbitHero';
import NextOnStage from '@/components/home/NextOnStage';
import FeaturedCoverflow from '@/components/home/FeaturedCoverflow';
import WhatsOn from '@/components/home/WhatsOn';
import VideoPlayer from '@/components/site/VideoPlayer';
import InMotion from '@/components/home/InMotion';
import StoriesFeature from '@/components/home/StoriesFeature';
import AboutFeature from '@/components/home/AboutFeature';
import PlanYourVisit from '@/components/home/PlanYourVisit';
import SectionHead from '@/components/ui/SectionHead';

export const revalidate = 300;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const locale = localeOf((await params).locale);
  const t = copy[locale];
  const [home, settings] = await Promise.all([content.homepage(), content.settings()]);
  const nowIso = new Date().toISOString();
  const on = (kind: string) => home.sections.find((s) => s.kind === kind)?.enabled ?? true;

  return (
    <main id="main">
      {on('hero_orbit') && <PerformanceOrbitHero locale={locale} events={home.hero.events} caption={home.hero.caption} nowIso={nowIso} />}
      {on('next_on_stage') && <NextOnStage locale={locale} performances={home.next_on_stage} demo={isDemo} />}
      {on('featured_performances') && home.featured.length > 0 && <FeaturedCoverflow locale={locale} events={home.featured} nowIso={nowIso} />}
      {on('whats_on') && (
        <Suspense fallback={<section className="whats-on wrap-wide"><SectionHead kicker={t.whatsOn} title={t.whatsOn} /></section>}>
          <WhatsOn locale={locale} events={home.whats_on} categories={home.categories} nowIso={nowIso} />
        </Suspense>
      )}
      {on('featured_video') && home.video && (
        <section className="film wrap-wide" aria-label={t.film}>
          <SectionHead kicker={t.film} />
          <VideoPlayer video={home.video} locale={locale} kicker={t.ringAfterDark} />
        </section>
      )}
      {on('in_motion') && <InMotion locale={locale} items={home.in_motion} />}
      {on('stories') && <StoriesFeature locale={locale} stories={home.stories} />}
      {on('about_feature') && home.about && <AboutFeature locale={locale} about={home.about} fragments={home.in_motion.filter((m) => m.id !== home.about?.image?.id).slice(0, 3)} />}
      {on('plan_your_visit') && home.visit && <PlanYourVisit locale={locale} venue={home.visit} email={settings.site.contact_email} phone={settings.site.phone} />}
    </main>
  );
}
