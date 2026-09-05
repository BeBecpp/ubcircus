'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { copy, localeOf } from '@/lib/i18n';

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const pathname = usePathname();
  const locale = localeOf(pathname.split('/')[1]);
  const t = copy[locale];
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="state-page">
      <div>
        <p className="eyebrow">{error.digest ?? 'error'}</p>
        <h1>{t.errorTitle}</h1>
        <p>{t.errorBody}</p>
        <div className="actions">
          <button className="btn" onClick={reset}>{t.retry}</button>
        </div>
      </div>
    </main>
  );
}
