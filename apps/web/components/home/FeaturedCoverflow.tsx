'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMotionValueEvent, useSpring } from 'motion/react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { copy, href, type Locale } from '@/lib/i18n';
import { fmtDay, fmtMonth, fmtWeekday, nextSession, sessionRange, translated, txs, type Event } from '@/lib/content';
import Artwork from '@/components/ui/Artwork';
import SectionHead from '@/components/ui/SectionHead';

type Props = { locale: Locale; events: Event[]; nowIso: string };

/** 3D perspective coverflow: drag, touch, inertia, keyboard, focus, click. */
export default function FeaturedCoverflow({ locale, events, nowIso }: Props) {
  const t = copy[locale];
  const router = useRouter();
  const n = events.length;
  const [index, setIndex] = useState(0);
  const [pos, setPos] = useState(0);
  const spring = useSpring(0, { stiffness: 140, damping: 22, mass: 0.9 });
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startPos: number; lastX: number; lastT: number; velocity: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const now = new Date(nowIso);
  useMotionValueEvent(spring, 'change', (v) => setPos(v));

  const go = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(n - 1, i));
      setIndex(clamped);
      spring.set(clamped);
    },
    [n, spring],
  );

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) spring.jump(index);
  }, [index, spring]);

  if (!n) return null;
  const selected = events[index];
  const tr = translated(selected, locale);
  const next = nextSession(selected, now) ?? sessionRange(selected)?.first ?? null;
  const cardWidth = () => stage.current?.querySelector<HTMLElement>('.coverflow-card')?.offsetWidth ?? 280;

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { startX: e.clientX, startPos: spring.get(), lastX: e.clientX, lastT: performance.now(), velocity: 0, moved: false };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 4) d.moved = true;
    const nowT = performance.now();
    d.velocity = (e.clientX - d.lastX) / Math.max(1, nowT - d.lastT);
    d.lastX = e.clientX;
    d.lastT = nowT;
    spring.jump(d.startPos - dx / (cardWidth() * 0.62));
  }
  function onPointerUp() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setDragging(false);
    const current = spring.get();
    const fling = -d.velocity * 0.9;
    go(Math.round(current + fling));
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    if (e.key === 'Home') { e.preventDefault(); go(0); }
    if (e.key === 'End') { e.preventDefault(); go(n - 1); }
    if (e.key === 'Enter') router.push(href(locale, `/events/${selected.slug}`));
  }

  return (
    <section className="coverflow-section" aria-labelledby="featured-title">
      <div className="wrap-wide">
        <SectionHead kicker={t.featured} id="featured-title" aside={{ href: href(locale, '/events'), label: t.all }} />
      </div>
      <div className="coverflow" tabIndex={0} onKeyDown={onKeyDown} role="group" aria-roledescription="carousel" aria-label={t.featured}>
        <div
          ref={stage}
          className={`coverflow-stage ${dragging ? 'is-dragging' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {events.map((event, i) => {
            const d = i - pos;
            const a = Math.abs(d);
            const width = cardWidth();
            const x = d * width * 0.62;
            const rotate = Math.max(-58, Math.min(58, -d * 34));
            const z = -a * 170;
            const scale = 1 - Math.min(a, 3) * 0.06;
            const opacity = a > 3.4 ? 0 : 1 - a * 0.2;
            const isCenter = i === index;
            const etr = translated(event, locale);
            return (
              <div
                key={event.id}
                className={`coverflow-card ${isCenter ? 'is-center' : ''}`}
                style={{ transform: `translate(-50%, -50%) translate3d(${x}px, 0, ${z}px) rotateY(${rotate}deg) scale(${scale})`, opacity, zIndex: 100 - Math.round(a * 10), ['--shade' as string]: Math.min(a * 0.32, 0.72) }}
                aria-hidden={!isCenter}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => {
                    if (drag.current?.moved) return;
                    if (isCenter) router.push(href(locale, `/events/${event.slug}`));
                    else go(i);
                  }}
                  aria-label={etr.title}
                >
                  <Artwork asset={event.poster} locale={locale} ratio="3x4" sizes="(max-width: 767px) 62vw, 340px" alt={etr.title} />
                  <span className="coverflow-index">{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="wrap-wide">
          <div className="coverflow-meta" aria-live="polite">
            <div className="when">
              {next ? (
                <>
                  {fmtDay(next.starts_at)} {fmtMonth(next.starts_at, locale)}
                  <small>{fmtWeekday(next.starts_at, locale)} · {selected.sessions.length} {t.sessions.toLowerCase()}</small>
                </>
              ) : (
                <>
                  —<small>{t.bookingSoon}</small>
                </>
              )}
            </div>
            <div className="what">
              <h3>{tr.title}</h3>
              <p>
                {txs(selected.venue?.name, locale)}
                {selected.duration_minutes ? ` · ${selected.duration_minutes} ${t.minutes}` : ''}
                {selected.category ? ` · ${txs(selected.category.labels, locale)}` : ''}
              </p>
            </div>
            <div className="go">
              <div className="coverflow-controls">
                <button className="circle" onClick={() => go(index - 1)} aria-label={t.previous} disabled={index === 0}>
                  <ArrowLeft strokeWidth={1.5} />
                </button>
                <button className="circle" onClick={() => go(index + 1)} aria-label={t.nextItem} disabled={index === n - 1}>
                  <ArrowRight strokeWidth={1.5} />
                </button>
              </div>
              <Link className="btn btn-ivory" href={href(locale, `/events/${selected.slug}`)}>
                {t.view}
                <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="coverflow-dots" role="tablist" aria-label={t.featured}>
            {events.map((e, i) => (
              <button key={e.id} role="tab" aria-current={i === index ? 'true' : undefined} aria-label={`${i + 1} ${t.of} ${n}`} onClick={() => go(i)}>
                <i />
              </button>
            ))}
          </div>
          <p className="coverflow-hint">{t.dragHint}</p>
        </div>
      </div>
    </section>
  );
}
