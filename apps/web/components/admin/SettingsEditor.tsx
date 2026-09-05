'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError, type MediaAssetOut } from '@/lib/admin/api';
import { Field, Panel, Toggle, useDirtyGuard, useToast } from './ui';
import { AssetField } from './MediaPicker';

type Site = { name: string; wordmark_sub: string; tagline: Record<string, string>; description: Record<string, string>; contact_email: string; phone: string; social: Record<string, string> };
type Seo = { title_template: string; og_image_id: string | null; index: boolean };
type Locales = { enabled: string[]; default: string };
type Contact = { categories: string[] };

export default function SettingsEditor({ initial, media, mode, isAdmin }: { initial: Record<string, unknown>; media: MediaAssetOut[]; mode: 'site' | 'seo'; isAdmin: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const s = (initial.site ?? {}) as Partial<Site>;
  const [site, setSite] = useState<Site>({ name: s.name ?? 'UB CIRCUS', wordmark_sub: s.wordmark_sub ?? 'УЛААНБААТАР', tagline: { mn: '', en: '', tr: '', ...(s.tagline ?? {}) }, description: { mn: '', en: '', tr: '', ...(s.description ?? {}) }, contact_email: s.contact_email ?? '', phone: s.phone ?? '', social: { instagram: '', facebook: '', youtube: '', ...(s.social ?? {}) } });
  const seo0 = (initial.seo ?? {}) as Partial<Seo>;
  const [seo, setSeo] = useState<Seo>({ title_template: seo0.title_template ?? '%s · UB CIRCUS', og_image_id: seo0.og_image_id ?? null, index: seo0.index ?? false });
  const loc0 = (initial.locales ?? {}) as Partial<Locales>;
  const [locales, setLocales] = useState<Locales>({ enabled: loc0.enabled ?? ['mn', 'en', 'tr'], default: loc0.default ?? 'mn' });
  const c0 = (initial.contact ?? {}) as Partial<Contact>;
  const [contact, setContact] = useState<Contact>({ categories: c0.categories ?? ['general', 'tickets', 'partnership', 'press', 'venue'] });
  const [dirty, setDirty] = useState(false);
  useDirtyGuard(dirty);
  const og = media.find((m) => m.id === seo.og_image_id) ?? null;

  async function save() {
    if (!isAdmin) { toast('error', 'Only administrators can change settings.'); return; }
    try {
      if (mode === 'site') {
        await api('settings/site', { method: 'PUT', json: { value: site } });
        await api('settings/locales', { method: 'PUT', json: { value: locales } });
        await api('settings/contact', { method: 'PUT', json: { value: contact } });
      } else {
        await api('settings/seo', { method: 'PUT', json: { value: seo } });
        await api('settings/site', { method: 'PUT', json: { value: site } });
      }
      setDirty(false);
      toast('ok', 'Settings saved.');
      router.refresh();
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Save failed');
    }
  }
  const mark = () => setDirty(true);
  if (mode === 'seo')
    return (
      <>
        <div className="bs-head">
          <div><p className="eyebrow">Site · SEO</p><h1>Search & sharing</h1><p>Defaults for titles, descriptions and the social sharing image. Individual events and stories override these.</p></div>
          <button type="button" className="btn btn-sm btn-brass" onClick={save} disabled={!isAdmin}>Save</button>
        </div>
        <div className="editor-layout">
          <div className="form-grid">
            <Field label="Title template" className="col-6" hint="%s is replaced by the page title"><input value={seo.title_template} onChange={(e) => { setSeo({ ...seo, title_template: e.target.value }); mark(); }} /></Field>
            <div className="col-6" style={{ alignSelf: 'end' }}><Toggle checked={seo.index} onChange={(v) => { setSeo({ ...seo, index: v }); mark(); }} label="Allow search engines to index the site" /></div>
            {(['mn', 'en', 'tr'] as const).map((l) => <Field key={l} label={`Site description · ${l.toUpperCase()}`} className="col-12"><textarea value={site.description[l]} onChange={(e) => { setSite({ ...site, description: { ...site.description, [l]: e.target.value } }); mark(); }} style={{ minHeight: 60 }} /></Field>)}
          </div>
          <aside className="editor-side"><Panel title="Default sharing image"><AssetField label="1200×630 recommended" value={og} onChange={(a) => { setSeo({ ...seo, og_image_id: a?.id ?? null }); mark(); }} wide /></Panel></aside>
        </div>
      </>
    );
  return (
    <>
      <div className="bs-head">
        <div><p className="eyebrow">System · Settings</p><h1>Settings</h1><p>Site identity, contact details, locales and contact-form topics.</p></div>
        <button type="button" className="btn btn-sm btn-brass" onClick={save} disabled={!isAdmin}>Save</button>
      </div>
      {!isAdmin && <p className="form-status" data-state="error" style={{ marginBottom: 20 }}>Read-only: administrator role required to change settings.</p>}
      <div className="editor-layout">
        <div className="form-grid">
          <Field label="Site name" className="col-6"><input value={site.name} onChange={(e) => { setSite({ ...site, name: e.target.value }); mark(); }} /></Field>
          <Field label="Wordmark line" className="col-6"><input value={site.wordmark_sub} onChange={(e) => { setSite({ ...site, wordmark_sub: e.target.value }); mark(); }} /></Field>
          {(['mn', 'en', 'tr'] as const).map((l) => <Field key={l} label={`Tagline · ${l.toUpperCase()}`} className="col-4"><input value={site.tagline[l]} onChange={(e) => { setSite({ ...site, tagline: { ...site.tagline, [l]: e.target.value } }); mark(); }} /></Field>)}
          <Field label="Contact email" className="col-6"><input value={site.contact_email} onChange={(e) => { setSite({ ...site, contact_email: e.target.value }); mark(); }} /></Field>
          <Field label="Phone" className="col-6"><input value={site.phone} onChange={(e) => { setSite({ ...site, phone: e.target.value }); mark(); }} /></Field>
          {Object.keys(site.social).map((k) => <Field key={k} label={`Social · ${k}`} className="col-4"><input value={site.social[k]} onChange={(e) => { setSite({ ...site, social: { ...site.social, [k]: e.target.value } }); mark(); }} placeholder="https://" /></Field>)}
          <Field label="Contact form topics" className="col-12" hint="Comma-separated keys: general, tickets, partnership, press, venue"><input value={contact.categories.join(', ')} onChange={(e) => { setContact({ categories: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) }); mark(); }} /></Field>
        </div>
        <aside className="editor-side">
          <Panel title="Locales">
            <div className="form-grid">
              <Field label="Enabled" className="col-12"><input value={locales.enabled.join(', ')} onChange={(e) => { setLocales({ ...locales, enabled: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) }); mark(); }} /></Field>
              <Field label="Default" className="col-12"><select value={locales.default} onChange={(e) => { setLocales({ ...locales, default: e.target.value }); mark(); }}>{['mn', 'en', 'tr'].map((l) => <option key={l} value={l}>{l}</option>)}</select></Field>
            </div>
            <p className="hint" style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>Routing currently supports mn, en and tr.</p>
          </Panel>
        </aside>
      </div>
    </>
  );
}
