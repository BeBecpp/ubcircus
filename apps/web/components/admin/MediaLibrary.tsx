'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, LayoutGrid, List, RefreshCw, Trash2, Upload } from 'lucide-react';
import { api, ApiError, uploadFile, type MediaAssetOut, type MediaMetaIn } from '@/lib/admin/api';
import { Field, useConfirm, useToast } from './ui';

const CATEGORIES = ['photography', 'performances', 'behind-the-scenes', 'posters', 'videos'] as const;
type Upload = { name: string; pct: number; error?: string };

export default function MediaLibrary({ initial, storageReady, selectId }: { initial: MediaAssetOut[]; storageReady: boolean; selectId?: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [selected, setSelected] = useState<string[]>(selectId ? [selectId] : []);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [over, setOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const [usage, setUsage] = useState<{ resource: string; label: string; field: string }[] | null>(null);

  const filtered = useMemo(() => items.filter((a) => (!q || `${a.file_name} ${a.credit} ${a.photographer} ${Object.values(a.alt ?? {}).join(' ')}`.toLowerCase().includes(q.toLowerCase())) && (!category || a.category === category) && (!type || a.mime_type === type)), [items, q, category, type]);
  const active = selected.length === 1 ? items.find((a) => a.id === selected[0]) ?? null : null;
  const [meta, setMeta] = useState<MediaMetaIn | null>(null);
  useEffect(() => {
    setMeta(active ? { alt: { mn: '', en: '', tr: '', ...active.alt }, caption: active.caption ?? { mn: '', en: '', tr: '' }, credit: active.credit, photographer: active.photographer, focal_x: active.focal_x, focal_y: active.focal_y, category: active.category as MediaMetaIn['category'], tags: active.tags } : null);
    if (active) api<{ resource: string; label: string; field: string }[]>(`media/${active.id}/usage`).then(setUsage).catch(() => setUsage(null));
    else setUsage(null);
  }, [active]);

  async function handleFiles(files: FileList | File[], replaceId?: string) {
    if (!storageReady) { toast('error', 'Storage is not configured on the API yet.'); return; }
    for (const file of Array.from(files)) {
      const row: Upload = { name: file.name, pct: 0 };
      setUploads((u) => [...u, row]);
      try {
        const asset = await uploadFile(file, {}, replaceId, (pct) => setUploads((u) => u.map((x) => (x === row ? { ...x, pct } : x))));
        setItems((list) => (replaceId ? list.map((a) => (a.id === asset.id ? asset : a)) : [asset, ...list]));
        setUploads((u) => u.filter((x) => x !== row));
        setSelected([asset.id]);
        toast('ok', replaceId ? 'File replaced.' : `Uploaded ${file.name}`);
      } catch (e) {
        setUploads((u) => u.map((x) => (x === row ? { ...x, error: e instanceof ApiError ? e.message : 'Upload failed' } : x)));
      }
    }
  }
  async function saveMeta() {
    if (!active || !meta) return;
    try {
      const saved = await api<MediaAssetOut>(`media/${active.id}`, { method: 'PUT', json: meta });
      setItems((list) => list.map((a) => (a.id === saved.id ? saved : a)));
      toast('ok', 'Saved.');
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Save failed');
    }
  }
  async function remove(ids: string[], force = false) {
    if (!confirm(`Delete ${ids.length} file${ids.length > 1 ? 's' : ''}? This removes them from storage.`)) return;
    for (const id of ids) {
      try {
        await api(`media/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' });
        setItems((list) => list.filter((a) => a.id !== id));
        setSelected((s) => s.filter((x) => x !== id));
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          const uses = (e.detail as { usage?: { resource: string; label: string }[] })?.usage ?? [];
          if (confirm(`This file is used by ${uses.length} item(s): ${uses.map((u) => `${u.resource} ${u.label}`).join(', ')}. Delete anyway?`)) return remove([id], true);
        } else toast('error', e instanceof ApiError ? e.message : 'Delete failed');
      }
    }
  }
  const copyUrl = async (url: string) => { await navigator.clipboard.writeText(url.startsWith('/') ? `${window.location.origin}${url}` : url); toast('ok', 'URL copied.'); };
  const toggle = (id: string, additive: boolean) => setSelected((s) => (additive ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : s.length === 1 && s[0] === id ? [] : [id]));
  const types = [...new Set(items.map((a) => a.mime_type))];

  return (
    <div className="media-layout">
      <div>
        <div className={`dropzone ${over ? 'is-over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); handleFiles(e.dataTransfer.files); }} onClick={() => fileInput.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && fileInput.current?.click()}>
          <Upload strokeWidth={1.2} style={{ width: 20, height: 20, margin: '0 auto 8px' }} />
          Drop images here or click to upload · JPG, PNG, WebP, AVIF, GIF · up to 25 MB
          {!storageReady && <div style={{ marginTop: 8, color: 'var(--red)' }}>Storage not configured — uploads disabled</div>}
          <input ref={fileInput} type="file" multiple accept="image/*" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        </div>
        {uploads.length > 0 && (
          <div className="upload-list">
            {uploads.map((u, i) => (
              <div key={i} className="upload-row">
                <span>{u.name}</span>
                <div className="bar"><i style={{ width: `${u.pct}%` }} /></div>
                <span style={{ color: u.error ? 'var(--red)' : 'var(--muted)' }}>{u.error ? 'failed' : `${u.pct}%`}</span>
              </div>
            ))}
          </div>
        )}
        <div className="media-toolbar">
          <div className="field"><input placeholder="Search file, credit, alt…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></div>
          <div className="field"><select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category"><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div className="field"><select value={type} onChange={(e) => setType(e.target.value)} aria-label="File type"><option value="">All types</option>{types.map((t) => <option key={t} value={t}>{t.replace('image/', '')}</option>)}</select></div>
          <span className="meta" style={{ marginLeft: 'auto' }}>{filtered.length} files{selected.length ? ` · ${selected.length} selected` : ''}</span>
          {selected.length > 0 && <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(selected)}><Trash2 strokeWidth={1.5} /> Delete</button>}
          <button type="button" className="btn btn-sm btn-icon" aria-label="Grid" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid strokeWidth={1.5} /></button>
          <button type="button" className="btn btn-sm btn-icon" aria-label="List" aria-pressed={view === 'list'} onClick={() => setView('list')}><List strokeWidth={1.5} /></button>
        </div>
        {view === 'grid' ? (
          <div className="media-grid">
            {filtered.map((a) => (
              <button key={a.id} type="button" className="media-tile" aria-pressed={selected.includes(a.id)} onClick={(e) => toggle(a.id, e.shiftKey || e.metaKey || e.ctrlKey)}>
                <span className="check" aria-hidden="true">{selected.includes(a.id) && <Check strokeWidth={2} />}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div className="art"><img src={a.url} alt={a.alt?.en ?? ''} loading="lazy" style={{ objectPosition: `${a.focal_x * 100}% ${a.focal_y * 100}%` }} /></div>
                <figcaption><span>{a.file_name}</span><span>{a.width}×{a.height}</span></figcaption>
              </button>
            ))}
          </div>
        ) : (
          <section className="panel media-list">
            <table className="table">
              <thead><tr><th></th><th>File</th><th>Type</th><th>Size</th><th>Dimensions</th><th>Category</th><th>Credit</th></tr></thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} onClick={(e) => toggle(a.id, e.shiftKey || e.metaKey)} style={{ cursor: 'pointer', background: selected.includes(a.id) ? 'rgba(201,163,92,0.08)' : undefined }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <td><img className="thumb" src={a.url} alt="" loading="lazy" /></td>
                    <td>{a.file_name}</td>
                    <td className="muted">{a.mime_type.replace('image/', '')}</td>
                    <td className="muted num">{(a.size / 1024).toFixed(0)} KB</td>
                    <td className="muted num">{a.width}×{a.height}</td>
                    <td className="muted">{a.category}</td>
                    <td className="muted">{a.credit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <p className="meta" style={{ marginTop: 14 }}>Shift-click to select several files.</p>
      </div>

      <aside className="media-detail">
        {active && meta ? (
          <section className="panel">
            <div className="panel-head"><b>Details</b><span>{active.mime_type.replace('image/', '')} · {(active.size / 1024).toFixed(0)} KB</span></div>
            <div className="panel-body">
              <div className="preview" title="Click to set the focal point" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMeta({ ...meta, focal_x: +((e.clientX - r.left) / r.width).toFixed(3), focal_y: +((e.clientY - r.top) / r.height).toFixed(3) }); }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={active.url} alt="" />
                <span className="focal" style={{ left: `${meta.focal_x * 100}%`, top: `${meta.focal_y * 100}%` }} />
              </div>
              <div className="kv">
                <span>File</span><b>{active.file_name}</b>
                <span>Dimensions</span><b>{active.width} × {active.height}</b>
                <span>Focal point</span><b>{Math.round(meta.focal_x * 100)}% · {Math.round(meta.focal_y * 100)}%</b>
                <span>Used by</span><b>{usage === null ? '…' : usage.length === 0 ? 'nothing yet' : usage.map((u) => `${u.resource} · ${u.label}`).join(', ')}</b>
              </div>
              <div className="form-grid" style={{ marginTop: 18, gap: 14 }}>
                {(['mn', 'en', 'tr'] as const).map((l) => (
                  <Field key={l} label={`Alt text · ${l.toUpperCase()}`} className="col-12"><input value={meta.alt[l] ?? ''} onChange={(e) => setMeta({ ...meta, alt: { ...meta.alt, [l]: e.target.value } })} /></Field>
                ))}
                <Field label="Caption · MN" className="col-12"><input value={meta.caption?.mn ?? ''} onChange={(e) => setMeta({ ...meta, caption: { ...(meta.caption ?? {}), mn: e.target.value } })} /></Field>
                <Field label="Caption · EN" className="col-12"><input value={meta.caption?.en ?? ''} onChange={(e) => setMeta({ ...meta, caption: { ...(meta.caption ?? {}), en: e.target.value } })} /></Field>
                <Field label="Credit" className="col-6"><input value={meta.credit} onChange={(e) => setMeta({ ...meta, credit: e.target.value })} /></Field>
                <Field label="Photographer" className="col-6"><input value={meta.photographer} onChange={(e) => setMeta({ ...meta, photographer: e.target.value })} /></Field>
                <Field label="Category" className="col-12"><select value={meta.category} onChange={(e) => setMeta({ ...meta, category: e.target.value as MediaMetaIn['category'] })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-sm btn-ivory" onClick={saveMeta}>Save</button>
                <button type="button" className="btn btn-sm" onClick={() => copyUrl(active.url)}><Copy strokeWidth={1.5} /> Copy URL</button>
                <button type="button" className="btn btn-sm" onClick={() => replaceInput.current?.click()} disabled={!storageReady || !active.object_key}><RefreshCw strokeWidth={1.5} /> Replace</button>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => remove([active.id])}><Trash2 strokeWidth={1.5} /> Delete</button>
                <input ref={replaceInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleFiles([e.target.files[0]], active.id)} />
              </div>
            </div>
          </section>
        ) : (
          <section className="panel"><div className="panel-body"><p className="meta">{selected.length > 1 ? `${selected.length} files selected` : 'Select a file to edit its metadata, focal point and usage.'}</p></div></section>
        )}
      </aside>
    </div>
  );
}
