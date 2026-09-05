'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { copy, type Locale } from '@/lib/i18n';
import { translated, txs, type Gallery, type MediaAsset, type MediaCategory, type Video } from '@/lib/content';
import Artwork from '@/components/ui/Artwork';
import MediaViewer, { type ViewerItem } from '@/components/site/MediaViewer';
import VideoPlayer from '@/components/site/VideoPlayer';

const CATEGORIES: MediaCategory[] = ['photography', 'performances', 'behind-the-scenes', 'posters', 'videos'];

export default function ArchiveGallery({ locale, galleries, media, videos }: { locale: Locale; galleries: Gallery[]; media: MediaAsset[]; videos: Video[] }) {
  const t = copy[locale];
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const active = (CATEGORIES.includes(sp.get('category') as MediaCategory) ? sp.get('category') : 'all') as MediaCategory | 'all';
  const [viewer, setViewer] = useState<number | null>(null);
  const label: Record<MediaCategory, string> = { photography: t.photography, performances: t.performancesCat, 'behind-the-scenes': t.behindScenes, posters: t.posters, videos: t.videos };

  const items = useMemo<ViewerItem[]>(() => {
    const seen = new Set<string>();
    const out: ViewerItem[] = [];
    for (const g of galleries) {
      if (active !== 'all' && g.category !== active) continue;
      for (const item of g.items) {
        if (seen.has(item.media.id)) continue;
        seen.add(item.media.id);
        out.push({ media: item.media, caption: txs(item.caption, locale) || `${translated(g, locale).title} · ${txs(item.media.alt, locale)}` });
      }
    }
    for (const m of media) {
      if (seen.has(m.id) || m.kind !== 'image') continue;
      if (active !== 'all' && m.category !== active) continue;
      seen.add(m.id);
      out.push({ media: m });
    }
    return out;
  }, [galleries, media, active, locale]);

  const select = (c: string) => {
    const p = new URLSearchParams(sp.toString());
    if (c === 'all') p.delete('category');
    else p.set('category', c);
    router.replace(`${pathname}${p.toString() ? `?${p}` : ''}`, { scroll: false });
  };
  const showVideos = active === 'all' || active === 'videos';

  return (
    <>
      <div className="media-filters">
        <div className="wrap-wide filters" role="group" aria-label={t.category}>
          <button type="button" aria-pressed={active === 'all'} onClick={() => select('all')}>{t.filterAll}</button>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" aria-pressed={active === c} onClick={() => select(c)}>{label[c]}</button>
          ))}
        </div>
      </div>
      <section className="wrap-wide" style={{ paddingBottom: 'clamp(56px, 7vw, 110px)' }}>
        {active !== 'videos' && (
          items.length === 0 ? (
            <div className="empty" style={{ marginTop: 32 }}><p>{t.noPerformances}</p></div>
          ) : (
            <div className="archive-grid">
              {items.map((item, i) => (
                <figure key={item.media.id}>
                  <button type="button" onClick={() => setViewer(i)} aria-label={`${t.openViewer}: ${txs(item.media.alt, locale)}`}>
                    <Artwork asset={item.media} locale={locale} ratio="none" sizes="(max-width: 767px) 50vw, 33vw" />
                  </button>
                  <figcaption>
                    <span>{String(i + 1).padStart(2, '0')} · {label[item.media.category] ?? item.media.category}</span>
                    <span>{item.media.width}×{item.media.height}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )
        )}
        {showVideos && videos.length > 0 && (
          <div style={{ marginTop: active === 'videos' ? 32 : 'clamp(56px, 7vw, 110px)' }}>
            <div className="section-head">
              <div className="kicker"><i aria-hidden="true" />{t.videos}</div>
            </div>
            <div className="archive-videos">
              {videos.map((v) => (
                <div key={v.id}>
                  <VideoPlayer video={v} locale={locale} />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      <MediaViewer items={items} index={viewer} onChange={setViewer} locale={locale} />
    </>
  );
}
