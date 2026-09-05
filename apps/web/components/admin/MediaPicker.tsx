'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { api, type MediaAssetOut } from '@/lib/admin/api';

type Props = { open: boolean; multiple?: boolean; onClose: () => void; onPick: (assets: MediaAssetOut[]) => void; initial?: string[] };

/** Modal media chooser used by every editor. Selection state is local; the library page owns uploads. */
export default function MediaPicker({ open, multiple = false, onClose, onPick, initial = [] }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<MediaAssetOut[]>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<string[]>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); setSelected(initial); }
    if (!open && d.open) d.close();
  }, [open, initial]);
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    api<MediaAssetOut[]>(`media?${params}`).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [open, q, category]);

  const toggle = (id: string) => setSelected((cur) => (multiple ? (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) : [id]));
  return (
    <dialog ref={ref} className="bs-dialog" onClose={onClose} aria-label="Choose media">
      <div className="bs-dialog-inner">
        <div className="panel-head">
          <b>Media library · {multiple ? 'select several' : 'select one'}</b>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input className="inline-input" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 180 }} />
            <select className="inline-input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: 160 }}>
              <option value="">All categories</option>
              {['photography', 'performances', 'behind-the-scenes', 'posters', 'videos'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" className="circle" onClick={onClose} aria-label="Close"><X strokeWidth={1.5} /></button>
          </div>
        </div>
        <div className="panel-body">
          {loading && items.length === 0 ? <p className="meta">Loading…</p> : items.length === 0 ? <p className="meta">No media found.</p> : (
            <div className="media-grid">
              {items.map((a) => (
                <button key={a.id} type="button" className="media-tile" aria-pressed={selected.includes(a.id)} onClick={() => toggle(a.id)}>
                  <span className="check" aria-hidden="true">{selected.includes(a.id) && <Check strokeWidth={2} />}</span>
                  <div className="art">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.alt?.en ?? a.file_name} loading="lazy" style={{ objectPosition: `${a.focal_x * 100}% ${a.focal_y * 100}%` }} />
                  </div>
                  <figcaption><span>{a.file_name}</span><span>{a.width}×{a.height}</span></figcaption>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="bs-dialog-foot">
          <span className="meta">{selected.length} selected</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-sm" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-sm btn-ivory" disabled={!selected.length} onClick={() => { onPick(selected.map((id) => items.find((a) => a.id === id)!).filter(Boolean)); onClose(); }}>Use selection</button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

/** Compact single-asset picker field. */
export function AssetField({ label, value, onChange, wide = false }: { label: string; value: MediaAssetOut | null; onChange: (a: MediaAssetOut | null) => void; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="field">
      <label>{label}</label>
      {value ? (
        <div className={`picker ${wide ? 'wide' : ''}`}>
          <div className="art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.url} alt="" style={{ objectPosition: `${value.focal_x * 100}% ${value.focal_y * 100}%` }} />
          </div>
          <div>
            <small>{value.file_name}</small>
            <small>{value.width}×{value.height} · {value.category}</small>
            <div className="row">
              <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>Change</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange(null)}>Remove</button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" className="picker-empty" onClick={() => setOpen(true)}>Choose from library</button>
      )}
      <MediaPicker open={open} onClose={() => setOpen(false)} onPick={(a) => onChange(a[0] ?? null)} initial={value ? [value.id] : []} />
    </div>
  );
}
