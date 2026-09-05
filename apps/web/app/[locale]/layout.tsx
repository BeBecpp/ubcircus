import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { copy, isLocale, locales } from '@/lib/i18n';
import { content, isDemo, txs } from '@/lib/content';
import MainNavigation from '@/components/site/MainNavigation';
import SiteFooter from '@/components/site/SiteFooter';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const settings = await content.settings();
  return {
    description: txs(settings.site.description, locale),
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])) },
  };
}

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [navigation, settings] = await Promise.all([content.navigation(), content.settings()]);
  const t = copy[locale];
  return (
    <div lang={locale}>
      <a className="skip-link" href="#main">{t.skip}</a>
      <MainNavigation locale={locale} items={navigation.filter((i) => i.group === 'header')} siteName={settings.site.name} wordmarkSub={settings.site.wordmark_sub} />
      {children}
      <SiteFooter locale={locale} items={navigation.filter((i) => i.group === 'footer')} settings={settings} demo={isDemo} />
    </div>
  );
}
