'use client';
import { useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { txs, type MediaAsset } from '@/lib/content';
import Artwork from '@/components/ui/Artwork';
import MediaViewer from '@/components/site/MediaViewer';

export default function EventGallery({ items, locale }: { items: MediaAsset[]; locale: Locale }) {
  const [viewer, setViewer] = useState<number | null>(null);
  return (
    <>
      <div className="gallery-grid">
        {items.map((asset, i) => (
          <figure key={asset.id}>
            <button type="button" onClick={() => setViewer(i)} aria-label={txs(asset.alt, locale)}>
              <Artwork asset={asset} locale={locale} ratio="none" sizes="(max-width: 767px) 100vw, 60vw" />
            </button>
            <figcaption>
              {String(i + 1).padStart(2, '0')} · {txs(asset.caption, locale) || txs(asset.alt, locale)}
            </figcaption>
          </figure>
        ))}
      </div>
      <MediaViewer items={items.map((media) => ({ media }))} index={viewer} onChange={setViewer} locale={locale} />
    </>
  );
}
