'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, GripVertical, X } from 'lucide-react';
import { LOCALES, type AdminLocale } from '@/lib/admin/api';

/* ---------- toast ---------- */
type Toast = { id: number; kind: 'ok' | 'error' | 'info'; text: string };
const ToastCtx = createContext<(kind: Toast['kind'], text: string) => void>(() => {});
export function useToast() {
  return useContext(ToastCtx);
}
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, kind, text }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {items.map((t, i) => (
        <div key={t.id} className="toast" data-kind={t.kind} role="status" style={{ bottom: 24 + i * 52 }}>
          {t.text}
          <button type="button" onClick={() => setItems((list) => list.filter((x) => x.id !== t.id))} aria-label="Dismiss"><X size={14} strokeWidth={1.5} /></button>
        </div>
      ))}
    </ToastCtx.Provider>
  );
}

/* ---------- fields ---------- */
export function Field({ label, hint, className = '', children, error }: { label: string; hint?: string; className?: string; children: ReactNode; error?: string }) {
  return (
    <div className={`field ${className}`} data-invalid={error ? 'true' : undefined}>
      <label>{label}</label>
      {children}
      {error ? <span className="error">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden="true" />
      {label}
    </label>
  );
}
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" type="button" aria-selected={value === t.id} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count !== undefined && <span className="n">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function LocaleTabs({ value, onChange, missing = [] }: { value: AdminLocale; onChange: (l: AdminLocale) => void; missing?: AdminLocale[] }) {
  return (
    <div className="locale-tabs" role="tablist" aria-label="Locale">
      {LOCALES.map((l) => (
        <button key={l} role="tab" type="button" aria-selected={value === l} onClick={() => onChange(l)}>
          {l.toUpperCase()}
          {missing.includes(l) && <i className="dot-missing" title="Missing title" />}
        </button>
      ))}
    </div>
  );
}
export function StatusPill({ value }: { value: string }) {
  return <span className={`status status-${value}`}>{value.replace('_', ' ')}</span>;
}
export function Panel({ title, aside, children, className = '' }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || aside) && (
        <div className="panel-head">
          <b>{title}</b>
          {aside}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty" style={{ padding: 32 }}><p style={{ fontSize: 20 }}>{children}</p></div>;
}

/* ---------- sortable list (keyboard buttons + HTML5 drag) ---------- */
export function Sortable<T>({ items, onChange, render, keyOf }: { items: T[]; onChange: (items: T[]) => void; render: (item: T, index: number) => ReactNode; keyOf: (item: T) => string }) {
  const [dragging, setDragging] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    onChange(next);
  };
  return (
    <div className="sortable">
      {items.map((item, i) => (
        <div
          key={keyOf(item)}
          className={`sortable-row ${dragging === i ? 'is-dragging' : ''}`}
          draggable
          onDragStart={() => setDragging(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (dragging !== null) move(dragging, i); setDragging(null); }}
          onDragEnd={() => setDragging(null)}
        >
          <span className="grip" aria-hidden="true"><GripVertical strokeWidth={1.5} /></span>
          <div>{render(item, i)}</div>
          <div className="ctrls">
            <button type="button" onClick={() => move(i, i - 1)} aria-label="Move up" disabled={i === 0}><ArrowUp strokeWidth={1.5} /></button>
            <button type="button" onClick={() => move(i, i + 1)} aria-label="Move down" disabled={i === items.length - 1}><ArrowDown strokeWidth={1.5} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- confirm ---------- */
export function useConfirm() {
  return useCallback((message: string) => (typeof window === 'undefined' ? false : window.confirm(message)), []);
}

/* ---------- unsaved changes guard ---------- */
export function useDirtyGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}

/* ---------- translation helper ---------- */
export function useTranslationsState<T extends Record<string, string>>(initial: Record<string, Partial<T>> | undefined, blank: T) {
  const [tr, setTr] = useState<Record<AdminLocale, T>>(() => ({ mn: { ...blank, ...(initial?.mn ?? {}) }, en: { ...blank, ...(initial?.en ?? {}) }, tr: { ...blank, ...(initial?.tr ?? {}) } }));
  const update = useCallback((locale: AdminLocale, patch: Partial<T>) => setTr((cur) => ({ ...cur, [locale]: { ...cur[locale], ...patch } })), []);
  const missing = useMemo(() => LOCALES.filter((l) => !tr[l].title?.trim()), [tr]);
  /** Only locales with a title are sent; the API stores exactly what it receives. */
  const payload = useMemo(() => Object.fromEntries(LOCALES.filter((l) => tr[l].title?.trim()).map((l) => [l, tr[l]])), [tr]);
  return { tr, update, missing, payload, setTr };
}
