'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiError, slugify, STATUSES, type AdminLocale, type GalleryIn, type GalleryOut, type MediaAssetOut } from '@/lib/admin/api';
import { Field, LocaleTabs, Panel, Sortable, StatusPill, useConfirm, useDirtyGuard, useToast, useTranslationsState } from './ui';
import MediaPicker from './MediaPicker';

const BLANK = { title: '', description: '' };
type Item = { media: MediaAssetOut; caption: Record<string, string> };

export default function GalleryEditor({ initial }: { initial: GalleryOut | null }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [locale, setLocale] = useState<AdminLocale>('mn');
  const { tr, update, missing, payload } = useTranslationsState(initial?.translations, BLANK);
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [status, setStatus] = useState<GalleryIn['status']>(initial?.status ?? 'draft');
  const [category, setCategory] = useState<GalleryIn['category']>((initial?.category as GalleryIn['category']) ?? 'photography');
  const [items, setItems] = useState<Item[]>((initial?.items ?? []).map((i) => ({ media: i.media, caption: { mn: '', en: '', tr: '', ...(i.caption ?? {}) } })));
  const [pick, setPick] = useState(false);
  const [dirty, setDirty] = useState(false);
  useDirtyGuard(dirty);
  const mark = () => setDirty(true);
  const title = tr.mn.title || tr.en.title || (initial ? initial.slug : 'New gallery');

  async function save(override?: Partial<GalleryIn>) {
    if (!slug) { toast('error', 'Slug is required.'); return; }
    try {
      const body: GalleryIn = { slug, status, category, sample: initial?.sample ?? false, translations: payload, items: items.map((i) => ({ media_id: i.media.id, caption: Object.values(i.caption).some(Boolean) ? i.caption : null })), ...override };
      const saved = initial ? await api<GalleryOut>(`galleries/${initial.id}`, { method: 'PUT', json: body }) : await api<GalleryOut>('galleries', { method: 'POST', json: body });
      setDirty(false);
      if (override?.status) setStatus(override.status);
      toast('ok', 'Saved.');
      if (!initial) router.replace(`/admin/galleries/${saved.id}`);
      else router.refresh();
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Save failed');
    }
  }
  async function remove() {
    if (!initial || !confirm(`Delete gallery “${title}”? Media files stay in the library.`)) return;
    await api(`galleries/${initial.id}`, { method: 'DELETE' });
    router.push('/admin/galleries');
  }
  return (
    <>
      <div className="editor-head">
        <div><p className="eyebrow">Media · Gallery</p><h1>{title}</h1><div className="meta"><StatusPill value={status} />{dirty && <span style={{ color: 'var(--brass)' }}>Unsaved changes</span>}</div></div>
        <div className="bs-actions">
          <button type="button" className="btn btn-sm" onClick={() => save()}>Save</button>
          <button type="button" className="btn btn-sm btn-brass" onClick={() => save({ status: 'published' })}>Publish</button>
        </div>
      </div>
      <div className="editor-layout">
        <div>
          <LocaleTabs value={locale} onChange={setLocale} missing={missing} />
          <div className="form-grid" style={{ marginBottom: 24 }}>
            <Field label={`Title · ${locale.toUpperCase()}`} className="col-8"><input value={tr[locale].title} onChange={(e) => { update(locale, { title: e.target.value }); mark(); if (!initial && locale === 'en') setSlug(slugify(e.target.value)); }} /></Field>
            <Field label="Slug" className="col-4"><input value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); mark(); }} /></Field>
            <Field label={`Description · ${locale.toUpperCase()}`} className="col-12"><textarea value={tr[locale].description} onChange={(e) => { update(locale, { description: e.target.value }); mark(); }} style={{ minHeight: 70 }} /></Field>
          </div>
          <Field label={`Items · ${items.length}`}>
            <Sortable items={items} keyOf={(i) => i.media.id} onChange={(l) => { setItems(l); mark(); }} render={(i) => (
              <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 1fr auto', gap: 12, alignItems: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.media.url} alt="" style={{ width: 56, height: 56, objectFit: 'cover' }} />
                <span style={{ fontSize: 12 }}>{i.media.file_name}<br /><span style={{ color: 'var(--muted)' }}>{i.media.width}×{i.media.height}</span></span>
                <input placeholder={`Caption · ${locale.toUpperCase()}`} value={i.caption[locale] ?? ''} onChange={(e) => { setItems((l) => l.map((x) => (x.media.id === i.media.id ? { ...x, caption: { ...x.caption, [locale]: e.target.value } } : x))); mark(); }} className="inline-input" />
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setItems((l) => l.filter((x) => x.media.id !== i.media.id)); mark(); }}>Remove</button>
              </div>
            )} />
            <button type="button" className="btn btn-sm" style={{ marginTop: 12, justifySelf: 'start' }} onClick={() => setPick(true)}><Plus strokeWidth={1.5} /> Add images</button>
          </Field>
          <MediaPicker open={pick} multiple onClose={() => setPick(false)} initial={items.map((i) => i.media.id)} onPick={(assets) => { setItems((cur) => [...cur, ...assets.filter((a) => !cur.some((c) => c.media.id === a.id)).map((media) => ({ media, caption: { mn: '', en: '', tr: '' } }))]); mark(); }} />
        </div>
        <aside className="editor-side">
          <Panel title="Settings">
            <div className="form-grid">
              <Field label="Archive category" className="col-12"><select value={category} onChange={(e) => { setCategory(e.target.value as GalleryIn['category']); mark(); }}>{['photography', 'performances', 'behind-the-scenes', 'posters', 'videos'].map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
              <Field label="Status" className="col-12"><select value={status} onChange={(e) => { setStatus(e.target.value as GalleryIn['status']); mark(); }}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
            </div>
          </Panel>
          {initial && <Panel title="Danger zone"><button type="button" className="btn btn-sm btn-danger" onClick={remove}><Trash2 strokeWidth={1.5} /> Delete gallery</button></Panel>}
        </aside>
      </div>
    </>
  );
}
