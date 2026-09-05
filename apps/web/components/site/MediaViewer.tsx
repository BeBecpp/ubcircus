'use client';
import { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { copy, type Locale } from '@/lib/i18n';
import { txs, type MediaAsset } from '@/lib/content';

export type ViewerItem = { media: MediaAsset; caption?: string };
type Props = { items: ViewerItem[]; index: number | null; onChange: (index: number | null) => void; locale: Locale };

/** Full-screen media viewer built on the native dialog: focus trapping, ESC and return focus for free. */
export default function MediaViewer({ items, index, onChange, locale }: Props) {
  const t = copy[locale];
  const ref = useRef<HTMLDialogElement>(null);
  const open = index !== null;
  const item = open ? items[index] : null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const step = useCallback(
    (delta: number) => {
      if (index === null || !items.length) return;
      onChange((index + delta + items.length) % items.length);
    },
    [index, items.length, onChange],
  );
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step]);

  return (
    <dialog ref={ref} className="viewer" onClose={() => onChange(null)} aria-label={t.openViewer}>
      {item && (
        <div className="viewer-inner">
          <div className="viewer-top">
            <span>
              {String(index! + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
            </span>
            <button type="button" onClick={() => onChange(null)}>
              {t.close}
              <X strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
          <div className="viewer-stage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={item.media.id} src={item.media.url} alt={txs(item.media.alt, locale)} width={item.media.width} height={item.media.height} />
            {items.length > 1 && (
              <>
                <button type="button" className="viewer-nav prev" onClick={() => step(-1)} aria-label={t.previous}>
                  <ChevronLeft strokeWidth={1.5} />
                </button>
                <button type="button" className="viewer-nav next" onClick={() => step(1)} aria-label={t.nextItem}>
                  <ChevronRight strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>
          <div className="viewer-caption">
            <div>
              <p>{item.caption || txs(item.media.caption, locale) || txs(item.media.alt, locale)}</p>
              <small>{item.media.width} × {item.media.height}</small>
            </div>
            <div className="credit">
              {item.media.photographer && <>{t.photographer}: {item.media.photographer}<br /></>}
              {item.media.credit && <>{t.credit}: {item.media.credit}</>}
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
