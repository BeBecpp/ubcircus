'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { copy, localeOf } from '@/lib/i18n';

export default function NotFound() {
  const pathname = usePathname();
  const locale = localeOf(pathname.split('/')[1]);
  const t = copy[locale];
  return (
    <main id="main" className="state-page">
      <div>
        <p className="eyebrow">404</p>
        <h1>{t.notFound}</h1>
        <p>{t.notFoundBody}</p>
        <div className="actions">
          <Link className="btn" href={`/${locale}`}>{t.home}<ArrowUpRight strokeWidth={1.5} aria-hidden="true" /></Link>
          <Link className="btn btn-ghost" href={`/${locale}/events`}>{t.performances}<ArrowUpRight strokeWidth={1.5} aria-hidden="true" /></Link>
        </div>
      </div>
    </main>
  );
}
