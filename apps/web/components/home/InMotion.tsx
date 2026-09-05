'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { copy, href, type Locale } from '@/lib/i18n';
import { txs, type MediaAsset } from '@/lib/content';
import Artwork from '@/components/ui/Artwork';
import SectionHead from '@/components/ui/SectionHead';
import MediaViewer from '@/components/site/MediaViewer';

/** Image-led filmstrip. Scroll-snap, keyboard-accessible buttons, no WebGL. */
export default function InMotion({ locale, items }: { locale: Locale; items: MediaAsset[] }) {
  const t = copy[locale];
  const strip = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [progress, setProgress] = useState({ start: 0, size: 20 });

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const update = () => {
      const total = el.scrollWidth - el.clientWidth;
      const size = Math.max(8, (el.clientWidth / el.scrollWidth) * 100);
      setProgress({ start: total > 0 ? (el.scrollLeft / total) * (100 - size) : 0, size });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [items.length]);

  const scrollBy = (dir: number) => strip.current?.scrollBy({ left: dir * strip.current.clientWidth * 0.8, behavior: 'smooth' });
  if (!items.length) return null;

  return (
    <section className="motion" aria-labelledby="motion-title">
      <div className="wrap-wide">
        <SectionHead kicker={t.inMotion} id="motion-title" aside={{ href: href(locale, '/media'), label: t.media }} />
      </div>
      <div className="wrap-wide">
        <div className="filmstrip" ref={strip}>
          {items.map((asset, i) => (
            <figure key={asset.id} className={`frame ${asset.height > asset.width ? 'tall' : ''}`}>
              <button type="button" onClick={() => setViewer(i)} aria-label={`${t.openViewer}: ${txs(asset.alt, locale)}`}>
                <Artwork asset={asset} locale={locale} ratio="none" sizes="(max-width: 767px) 80vw, 33vw" />
              </button>
              <figcaption>
                <span>{String(i + 1).padStart(2, '0')} · {txs(asset.caption, locale) || txs(asset.alt, locale)}</span>
                <span>{asset.credit}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="strip-controls">
          <button className="circle" type="button" onClick={() => scrollBy(-1)} aria-label={t.previous}>
            <ArrowLeft strokeWidth={1.5} />
          </button>
          <div className="bar" aria-hidden="true">
            <i style={{ ['--start' as string]: `${progress.start}%`, ['--size' as string]: `${progress.size}%` }} />
          </div>
          <button className="circle" type="button" onClick={() => scrollBy(1)} aria-label={t.nextItem}>
            <ArrowRight strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <MediaViewer items={items.map((media) => ({ media }))} index={viewer} onChange={setViewer} locale={locale} />
    </section>
  );
}
