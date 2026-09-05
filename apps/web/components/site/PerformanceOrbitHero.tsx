'use client';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { copy, href, type Locale } from '@/lib/i18n';
import { fmtDay, fmtMonth, nextSession, translated, txs, type Event, type Tr } from '@/lib/content';

const Scene = dynamic(() => import('@/components/three/PerformanceOrbitScene'), { ssr: false });
export type Quality = 'high' | 'medium' | 'low';

type Props = { locale: Locale; events: Event[]; caption: Tr; nowIso: string };

function detectQuality(): Quality | null {
  if (typeof window === 'undefined') return null;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  if (window.innerWidth < 768) return null;
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  if (!gl) return null;
  let software = false;
  try {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    software = /swiftshader|llvmpipe|software/i.test(renderer);
  } catch {
    software = false;
  }
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  if (software) return null;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? (cores >= 8 ? 8 : 4);
  if (cores >= 8 && memory >= 8) return 'high';
  if (cores >= 4 && memory >= 4) return 'medium';
  return 'low';
}

export default function PerformanceOrbitHero({ locale, events, caption, nowIso }: Props) {
  const t = copy[locale];
  const ref = useRef<HTMLElement>(null);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [focus, setFocus] = useState<number | null>(null);
  const now = new Date(nowIso);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const detect = () => {
      setReady(false);
      setQuality(detectQuality());
    };
    detect();
    mq.addEventListener('change', detect);
    let width = window.innerWidth;
    const resize = () => {
      const crossed = (width < 768) !== (window.innerWidth < 768);
      width = window.innerWidth;
      if (crossed) detect();
    };
    window.addEventListener('resize', resize);
    const scroll = () => {
      if (ref.current) ref.current.style.setProperty('--hero-progress', String(Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1)));
    };
    scroll();
    window.addEventListener('scroll', scroll, { passive: true });
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.05 });
    if (ref.current) io.observe(ref.current);
    return () => {
      mq.removeEventListener('change', detect);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', scroll);
      io.disconnect();
    };
  }, []);

  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => {
    setQuality(null);
    setReady(false);
  }, []);
  const focused = focus !== null ? events[focus % events.length] : null;
  const focusedSession = focused ? nextSession(focused, now) : null;

  return (
    <section className="orbit-hero" ref={ref} aria-label={`${t.city} ${t.circus}`}>
      <div className="stage-coordinates" aria-hidden="true">
        <span>47°55′ N</span>
        <span>106°55′ E</span>
      </div>

      <div className={`poster-field ${ready ? 'is-ready' : ''}`} aria-hidden="true">
        <div className="poster-ring" />
        {Array.from({ length: 8 }, (_, i) => {
          const event = events[i % Math.max(events.length, 1)];
          return event?.poster ? (
            <div key={i} className={`floating-poster p${i}`}>
              <Image src={event.poster.url} alt="" width={300} height={400} priority={i < 2} sizes="220px" />
            </div>
          ) : null;
        })}
      </div>

      {quality && events.length > 0 && (
        <div className={`scene-layer ${ready ? 'is-ready' : ''}`} aria-hidden="true">
          <Scene events={events} locale={locale} quality={quality} active={active} onReady={onReady} onFail={onFail} onFocus={setFocus} />
        </div>
      )}

      <div className="hero-caption">
        <span className="dot" />
        {txs(caption, locale) || t.season}
      </div>
      <div className="hero-type">
        <div className="hero-city">{t.city}</div>
        <h1>{t.circus}</h1>
        <p>{t.tagline}</p>
        <div className="hero-actions">
          <Link className="hero-cta" href={href(locale, '/events')}>
            {t.upcoming}
            <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
          </Link>
          <Link className="hero-cta is-red" href={href(locale, '/events')}>
            {t.tickets}
            <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className={`hero-focus ${focused ? 'is-on' : ''}`} aria-live="polite">
        {focused && (
          <>
            <i>{String((focus ?? 0) % events.length + 1).padStart(2, '0')}</i>
            <b>{translated(focused, locale).title}</b>
            {focusedSession && <span>{fmtDay(focusedSession.starts_at)} {fmtMonth(focusedSession.starts_at, locale)}</span>}
          </>
        )}
      </div>

      <div className="hero-bottom">
        <span>{t.ringAfterDark.split(' ').slice(0, 2).join(' ')}<br />{t.ringAfterDark.split(' ').slice(2).join(' ')}</span>
        <a href="#next">
          {t.scroll}
          <ArrowDown strokeWidth={1.5} aria-hidden="true" />
        </a>
        <span>01 — {String(events.length).padStart(2, '0')}<br />UB / MN</span>
      </div>

      <ul className="sr-only">
        {events.map((e) => (
          <li key={e.id}>
            <Link href={href(locale, `/events/${e.slug}`)}>{translated(e, locale).title}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
