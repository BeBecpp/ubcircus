'use client';
import { useState } from 'react';
import { copy, type Locale } from '@/lib/i18n';

export default function ShareButtons({ locale, title }: { locale: Locale; title: string }) {
  const t = copy[locale];
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div className="share">
      <button type="button" onClick={share}>{copied ? '✓ URL' : t.share}</button>
    </div>
  );
}
