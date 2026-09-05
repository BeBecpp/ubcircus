'use client';
/** Dashboard signature: an abstract circus ring with upcoming sessions as nodes. Canvas 2D — light, no textures, no WebGL. */
import { useEffect, useRef, useState } from 'react';
import type { DashboardOut } from '@/lib/admin/api';
import { fmtDateTime, titleOf } from '@/lib/admin/api';

type Node = { x: number; y: number; r: number; label: string; when: string; href: string; angle: number; status: string };

export default function RingSignature({ sessions, now }: { sessions: DashboardOut['upcoming_sessions']; now: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [focus, setFocus] = useState<Node | null>(null);
  const nodes = useRef<Node[]>([]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = new Date(now).getTime();
    const horizon = 30 * 24 * 3600 * 1000;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (el.width !== w * dpr || el.height !== h * dpr) { el.width = w * dpr; el.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h * 0.62;
      const rx = Math.min(w * 0.42, 420);
      const ry = rx * 0.32;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * (1 - i * 0.14), ry * (1 - i * 0.14), 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(201,163,92,${0.35 - i * 0.1})`;
        ctx.lineWidth = i === 0 ? 1.2 : 0.6;
        ctx.stroke();
      }
      const list: Node[] = [];
      sessions.forEach((p, i) => {
        const offset = new Date(p.session.starts_at).getTime() - start;
        const frac = Math.max(0, Math.min(1, offset / horizon));
        const angle = -Math.PI / 2 + frac * Math.PI * 1.7 + (reduced ? 0 : Math.sin(t * 0.0006 + i) * 0.02);
        const x = cx + Math.cos(angle) * rx;
        const y = cy + Math.sin(angle) * ry;
        const r = 5 + (1 - frac) * 6;
        const status = p.session.status;
        list.push({ x, y, r, angle, status, label: titleOf(p.event), when: fmtDateTime(p.session.starts_at), href: `/admin/events/${p.event.id}` });
      });
      nodes.current = list;
      for (const n of list) {
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(n.x, n.y - 40 - n.r * 3);
        ctx.strokeStyle = 'rgba(242,236,226,0.12)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.status === 'cancelled' ? '#d92e2e' : n.status === 'sold_out' ? '#7d766d' : focus?.href === n.href ? '#f2ece2' : '#c9a35c';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x, n.y - 40 - n.r * 3, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(242,236,226,0.5)';
        ctx.fill();
      }
      if (!reduced) {
        t += 16;
        raf = requestAnimationFrame(draw);
      }
    };
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, [sessions, now, focus]);

  const hit = (e: React.MouseEvent) => {
    const rect = canvas.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return nodes.current.find((n) => Math.hypot(n.x - x, n.y - y) < n.r + 8) ?? null;
  };
  return (
    <div className="dash-ring" aria-label="Upcoming sessions around the ring">
      <canvas ref={canvas} style={{ width: '100%', height: '100%', cursor: focus ? 'pointer' : 'default' }} onMouseMove={(e) => setFocus(hit(e))} onMouseLeave={() => setFocus(null)} onClick={(e) => { const n = hit(e); if (n) window.location.href = n.href; }} />
      <span className="legend">Next 30 days · {sessions.length} sessions</span>
      {focus ? (
        <div className="focus"><b>{focus.label}</b><small>{focus.when}</small></div>
      ) : sessions[0] ? (
        <div className="focus"><small>Hover a node</small></div>
      ) : (
        <div className="focus"><small>No sessions scheduled</small></div>
      )}
    </div>
  );
}
