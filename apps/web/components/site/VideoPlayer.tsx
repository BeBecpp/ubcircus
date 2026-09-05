'use client';
import { useState } from 'react';
import { Play } from 'lucide-react';
import { copy, type Locale } from '@/lib/i18n';
import { translated, type Video } from '@/lib/content';
import Artwork from '@/components/ui/Artwork';

/** Poster-first video: the YouTube player (privacy-enhanced domain) is only created after interaction. */
export default function VideoPlayer({ video, locale, kicker, priority }: { video: Video; locale: Locale; kicker?: string; priority?: boolean }) {
  const t = copy[locale];
  const [playing, setPlaying] = useState(false);
  const tr = translated(video, locale);
  const id = video.youtube_id;
  return (
    <div className="film-frame">
      {playing && id ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={tr.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <>
          <Artwork asset={video.poster} locale={locale} ratio="none" className="film-poster" sizes="100vw" priority={priority} alt={tr.title} />
          {id ? (
            <button type="button" className="film-play" onClick={() => setPlaying(true)} aria-label={`${t.play}: ${tr.title}`}>
              <span>
                <Play strokeWidth={1.2} fill="currentColor" aria-hidden="true" />
              </span>
            </button>
          ) : (
            <div className="film-empty" aria-hidden="true">
              <span>{t.noVideo}</span>
            </div>
          )}
          <div className="film-caption">
            <div>
              <h3>{tr.title}</h3>
              {tr.subtitle && <p>{tr.subtitle}</p>}
            </div>
            {kicker && <span className="eyebrow">{kicker}</span>}
          </div>
        </>
      )}
    </div>
  );
}
