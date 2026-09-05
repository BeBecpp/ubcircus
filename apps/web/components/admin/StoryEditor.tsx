'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowUpRight, Trash2 } from 'lucide-react';
import { api, ApiError, fromLocalInput, slugify, STATUSES, toLocalInput, type AdminLocale, type ArticleIn, type ArticleOut, type CategoryOut, type MediaAssetOut } from '@/lib/admin/api';
import { Field, LocaleTabs, Panel, StatusPill, Tabs, Toggle, useConfirm, useDirtyGuard, useToast, useTranslationsState } from './ui';
import { AssetField } from './MediaPicker';
import RichText from './RichText';

const BLANK = { title: '', subtitle: '', excerpt: '', body: '', seo_title: '', seo_description: '' };
type Tab = 'content' | 'seo' | 'publishing';

export default function StoryEditor({ initial, categories }: { initial: ArticleOut | null; categories: CategoryOut[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('content');
  const [locale, setLocale] = useState<AdminLocale>('mn');
  const { tr, update, missing, payload } = useTranslationsState(initial?.translations, BLANK);
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [status, setStatus] = useState<ArticleIn['status']>(initial?.status ?? 'draft');
  const [categoryId, setCategoryId] = useState(initial?.category?.id ?? '');
  const [lead, setLead] = useState<MediaAssetOut | null>(initial?.lead_image ?? null);
  const [publishedAt, setPublishedAt] = useState(toLocalInput(initial?.published_at));
  const [reading, setReading] = useState(initial?.reading_minutes?.toString() ?? '');
  const [sample, setSample] = useState(initial?.sample ?? false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useDirtyGuard(dirty);
  const mark = () => setDirty(true);
  const title = tr.mn.title || tr.en.title || tr.tr.title || (initial ? initial.slug : 'New story');

  async function save(override?: Partial<ArticleIn>) {
    if (!tr.mn.title.trim() && !tr.en.title.trim()) { toast('error', 'A title in Mongolian or English is required.'); return; }
    setBusy(true);
    try {
      const body: ArticleIn = { slug: slug || slugify(tr.en.title || tr.mn.title), status, category_id: categoryId || null, lead_image_id: lead?.id ?? null, published_at: publishedAt ? fromLocalInput(publishedAt) : null, sample, reading_minutes: reading ? Number(reading) : null, translations: payload, ...override };
      const saved = initial ? await api<ArticleOut>(`articles/${initial.id}`, { method: 'PUT', json: body }) : await api<ArticleOut>('articles', { method: 'POST', json: body });
      setDirty(false);
      if (override?.status) setStatus(override.status);
      toast('ok', override?.status === 'published' ? 'Published.' : 'Saved.');
      if (!initial) router.replace(`/admin/stories/${saved.id}`);
      else router.refresh();
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!initial || !confirm(`Delete “${title}”?`)) return;
    await api(`articles/${initial.id}`, { method: 'DELETE' });
    toast('ok', 'Deleted.');
    router.push('/admin/stories');
  }
  return (
    <>
      <div className="editor-head">
        <div>
          <p className="eyebrow">Editorial · Story</p>
          <h1>{title}</h1>
          <div className="meta"><StatusPill value={status} />{initial && <span>/{initial.slug}</span>}{dirty && <span style={{ color: 'var(--brass)' }}>Unsaved changes</span>}</div>
        </div>
        <div className="bs-actions">
          {initial && <Link className="btn btn-sm" href={`/mn/stories/${initial.slug}`} target="_blank" rel="noopener">Preview <ArrowUpRight strokeWidth={1.5} /></Link>}
          <button type="button" className="btn btn-sm" onClick={() => save()} disabled={busy}>Save</button>
          <button type="button" className="btn btn-sm btn-brass" onClick={() => save({ status: 'published' })} disabled={busy}>{status === 'published' ? 'Save & publish' : 'Publish'}</button>
        </div>
      </div>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'content', label: 'Content' }, { id: 'seo', label: 'SEO' }, { id: 'publishing', label: 'Publishing' }]} />
      {tab === 'content' && (
        <div className="editor-layout">
          <div>
            <LocaleTabs value={locale} onChange={setLocale} missing={missing} />
            <div className="form-grid">
              <Field label={`Title · ${locale.toUpperCase()}`} className="col-8"><input value={tr[locale].title} onChange={(e) => { update(locale, { title: e.target.value }); mark(); if (!slugTouched && locale === 'en') setSlug(slugify(e.target.value)); }} /></Field>
              <Field label="Slug" className="col-4"><input value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); mark(); }} /></Field>
              <Field label={`Dek / subtitle · ${locale.toUpperCase()}`} className="col-12"><input value={tr[locale].subtitle} onChange={(e) => { update(locale, { subtitle: e.target.value }); mark(); }} /></Field>
              <Field label={`Excerpt · ${locale.toUpperCase()}`} className="col-12"><textarea value={tr[locale].excerpt} onChange={(e) => { update(locale, { excerpt: e.target.value }); mark(); }} style={{ minHeight: 70 }} /></Field>
              <div className="col-12"><RichText label={`Body · ${locale.toUpperCase()}`} value={tr[locale].body} onChange={(v) => { update(locale, { body: v }); mark(); }} /></div>
            </div>
          </div>
          <aside className="editor-side">
            <Panel title="Lead image"><AssetField label="16:9 or 21:9" value={lead} onChange={(a) => { setLead(a); mark(); }} wide /></Panel>
            <Panel title="Classification">
              <div className="form-grid">
                <Field label="Category" className="col-12">
                  <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); mark(); }}>
                    <option value="">—</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.labels.en ?? c.slug}</option>)}
                  </select>
                </Field>
                <Field label="Reading time (min)" className="col-12"><input type="number" min={0} value={reading} onChange={(e) => { setReading(e.target.value); mark(); }} /></Field>
              </div>
            </Panel>
          </aside>
        </div>
      )}
      {tab === 'seo' && (
        <div className="editor-layout">
          <div>
            <LocaleTabs value={locale} onChange={setLocale} missing={missing} />
            <div className="form-grid">
              <Field label={`SEO title · ${locale.toUpperCase()}`} className="col-12"><input value={tr[locale].seo_title} onChange={(e) => { update(locale, { seo_title: e.target.value }); mark(); }} /></Field>
              <Field label={`SEO description · ${locale.toUpperCase()}`} className="col-12"><textarea value={tr[locale].seo_description} onChange={(e) => { update(locale, { seo_description: e.target.value }); mark(); }} style={{ minHeight: 80 }} /></Field>
            </div>
          </div>
        </div>
      )}
      {tab === 'publishing' && (
        <div className="editor-layout">
          <div className="form-grid">
            <Field label="Status" className="col-4"><select value={status} onChange={(e) => { setStatus(e.target.value as ArticleIn['status']); mark(); }}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
            <Field label="Published at" className="col-4"><input type="datetime-local" value={publishedAt} onChange={(e) => { setPublishedAt(e.target.value); mark(); }} /></Field>
            <div className="col-4" style={{ alignSelf: 'end' }}><Toggle checked={sample} onChange={(v) => { setSample(v); mark(); }} label="Sample content" /></div>
          </div>
          {initial && <aside className="editor-side"><Panel title="Danger zone"><button type="button" className="btn btn-sm btn-danger" onClick={remove}><Trash2 strokeWidth={1.5} /> Delete story</button></Panel></aside>}
        </div>
      )}
    </>
  );
}
