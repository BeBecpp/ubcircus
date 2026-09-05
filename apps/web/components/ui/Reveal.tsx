'use client';
import { useEffect, useRef, type ReactNode } from 'react';

/** Adds `is-in` when the element enters the viewport. Used for a few deliberate reveals only. */
export default function Reveal({ children, className = '', as: Tag = 'div', threshold = 0.2 }: { children?: ReactNode; className?: string; as?: 'div' | 'section' | 'hr' | 'li'; threshold?: number }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) { el.classList.add('is-in'); io.disconnect(); }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  const Element = Tag as 'div';
  return (
    <Element ref={ref as React.RefObject<HTMLDivElement>} className={className}>
      {children}
    </Element>
  );
}
