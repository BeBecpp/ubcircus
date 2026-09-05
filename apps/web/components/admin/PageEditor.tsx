'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api, ApiError, slugify, STATUSES, type AdminLocale, type PageIn, type PageOut } from '@/lib/admin/api';
import { Field, LocaleTabs, Panel, StatusPill, useConfirm, useDirtyGuard, useToast, useTranslationsState } from './ui';
import RichText from './RichText';

const BLANK = { title: '', subtitle: '', body: '', seo_title: '', seo_description: '' };

export default function PageEditor({ initial }: { initial: PageOut | null }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [locale, setLocale] = useState<AdminLocale>('mn');
  const { tr, update, missing, payload } = useTranslationsState(initial?.translations, BLANK);
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [status, setStatus] = useState<PageIn['status']>(initial?.status ?? 'draft');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  useDirtyGuard(dirty);
  const mark = () => setDirty(true);
  const title = tr.mn.title || tr.en.title || (initial ? initial.slug : 'New page');
  const locked = initial && ['about', 'visit', 'contact'].includes(initial.slug);

  async function save(override?: Partial<PageIn>) {
    if (!slug) { toast('error', 'Slug is required.'); return; }
    setBusy(true);
    try {
      const body: PageIn = { slug, status, settings: initial?.settings ?? {}, translations: payload, ...override };
      const saved = initial ? await api<PageOut>(`pages/${initial.id}`, { method: 'PUT', json: body }) : await api<PageOut>('pages', { method: 'POST', json: body });
      setDirty(false);
      if (override?.status) setStatus(override.status);
      toast('ok', 'Saved.');
      if (!initial) router.replace(`/admin/pages/${saved.id}`);
      else router.refresh();
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!initial || !confirm(`Delete page “${title}”?`)) return;
    await api(`pages/${initial.id}`, { method: 'DELETE' });
    router.push('/admin/pages');
  }
  return (
    <>
      <div className="editor-head">
        <div><p className="eyebrow">Editorial · Page</p><h1>{title}</h1><div className="meta"><StatusPill value={status} />{initial && <span>/{initial.slug}</span>}{dirty && <span style={{ color: 'var(--brass)' }}>Unsaved changes</span>}</div></div>
        <div className="bs-actions">
          <button type="button" className="btn btn-sm" onClick={() => save()} disabled={busy}>Save</button>
          <button type="button" className="btn btn-sm btn-brass" onClick={() => save({ status: 'published' })} disabled={busy}>Publish</button>
        </div>
      </div>
      <div className="editor-layout">
        <div>
          <LocaleTabs value={locale} onChange={setLocale} missing={missing} />
          <div className="form-grid">
            <Field label={`Title · ${locale.toUpperCase()}`} className="col-8"><input value={tr[locale].title} onChange={(e) => { update(locale, { title: e.target.value }); mark(); }} /></Field>
            <Field label="Slug" className="col-4" hint={locked ? 'Core page — slug is fixed' : undefined}><input value={slug} disabled={!!locked} onChange={(e) => { setSlug(slugify(e.target.value)); mark(); }} /></Field>
            <Field label={`Subtitle · ${locale.toUpperCase()}`} className="col-12"><input value={tr[locale].subtitle} onChange={(e) => { update(locale, { subtitle: e.target.value }); mark(); }} /></Field>
            <div className="col-12"><RichText label={`Body · ${locale.toUpperCase()}`} value={tr[locale].body} onChange={(v) => { update(locale, { body: v }); mark(); }} /></div>
            <Field label={`SEO title · ${locale.toUpperCase()}`} className="col-6"><input value={tr[locale].seo_title} onChange={(e) => { update(locale, { seo_title: e.target.value }); mark(); }} /></Field>
            <Field label={`SEO description · ${locale.toUpperCase()}`} className="col-6"><input value={tr[locale].seo_description} onChange={(e) => { update(locale, { seo_description: e.target.value }); mark(); }} /></Field>
          </div>
        </div>
        <aside className="editor-side">
          <Panel title="Publishing">
            <Field label="Status"><select value={status} onChange={(e) => { setStatus(e.target.value as PageIn['status']); mark(); }}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
          </Panel>
          {initial && !locked && <Panel title="Danger zone"><button type="button" className="btn btn-sm btn-danger" onClick={remove}><Trash2 strokeWidth={1.5} /> Delete page</button></Panel>}
        </aside>
      </div>
    </>
  );
}
