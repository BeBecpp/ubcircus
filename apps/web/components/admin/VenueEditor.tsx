'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError, type AdminLocale, type VenueIn, type VenueOut } from '@/lib/admin/api';
import { Field, LocaleTabs, Panel, Toggle, useDirtyGuard, useToast } from './ui';

const TR_FIELDS = ['name', 'address', 'directions', 'accessibility', 'hours', 'notes'] as const;
type TrField = (typeof TR_FIELDS)[number];

export default function VenueEditor({ initial }: { initial: VenueOut | null }) {
  const router = useRouter();
  const toast = useToast();
  const [locale, setLocale] = useState<AdminLocale>('mn');
  const [form, setForm] = useState<VenueIn>({
    slug: initial?.slug ?? 'main-arena',
    name: { mn: '', en: '', tr: '', ...(initial?.name ?? {}) },
    address: { mn: '', en: '', tr: '', ...(initial?.address ?? {}) },
    directions: { mn: '', en: '', tr: '', ...(initial?.directions ?? {}) },
    accessibility: { mn: '', en: '', tr: '', ...(initial?.accessibility ?? {}) },
    hours: { mn: '', en: '', tr: '', ...(initial?.hours ?? {}) },
    notes: { mn: '', en: '', tr: '', ...(initial?.notes ?? {}) },
    map_url: initial?.map_url ?? null,
    latitude: initial?.latitude ?? null,
    longitude: initial?.longitude ?? null,
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    verified: initial?.verified ?? false,
  });
  const [dirty, setDirty] = useState(false);
  useDirtyGuard(dirty);
  const set = (patch: Partial<VenueIn>) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); };
  const setTr = (field: TrField, value: string) => set({ [field]: { ...(form[field] as Record<string, string>), [locale]: value } } as Partial<VenueIn>);
  async function save() {
    try {
      if (initial) await api(`venues/${initial.id}`, { method: 'PUT', json: form });
      else await api('venues', { method: 'POST', json: form });
      setDirty(false);
      toast('ok', 'Visitor information saved.');
      router.refresh();
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Save failed');
    }
  }
  return (
    <>
      <div className="bs-head">
        <div><p className="eyebrow">Site · Visit</p><h1>Plan your visit</h1><p>Address, directions, accessibility and box-office hours shown on the Visit page, the homepage and every event.</p></div>
        <button type="button" className="btn btn-sm btn-brass" onClick={save}>Save</button>
      </div>
      <div className="editor-layout">
        <div>
          <LocaleTabs value={locale} onChange={setLocale} />
          <div className="form-grid">
            {TR_FIELDS.map((f) => (
              <Field key={f} label={`${f} · ${locale.toUpperCase()}`} className={f === 'name' ? 'col-8' : 'col-12'}>
                {f === 'name' ? <input value={(form[f] as Record<string, string>)[locale] ?? ''} onChange={(e) => setTr(f, e.target.value)} /> : <textarea value={(form[f] as Record<string, string>)[locale] ?? ''} onChange={(e) => setTr(f, e.target.value)} style={{ minHeight: 64 }} />}
              </Field>
            ))}
          </div>
        </div>
        <aside className="editor-side">
          <Panel title="Verification">
            <Toggle checked={form.verified} onChange={(v) => set({ verified: v })} label="Details verified" />
            <p className="hint" style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>Unverified venues show an “unverified information” notice publicly.</p>
          </Panel>
          <Panel title="Contact & map">
            <div className="form-grid">
              <Field label="Email" className="col-12"><input value={form.email} onChange={(e) => set({ email: e.target.value })} /></Field>
              <Field label="Phone" className="col-12"><input value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
              <Field label="Google Maps embed URL" className="col-12" hint="https://www.google.com/maps/embed?…"><input value={form.map_url ?? ''} onChange={(e) => set({ map_url: e.target.value || null })} /></Field>
              <Field label="Latitude" className="col-6"><input type="number" step="any" value={form.latitude ?? ''} onChange={(e) => set({ latitude: e.target.value ? Number(e.target.value) : null })} /></Field>
              <Field label="Longitude" className="col-6"><input type="number" step="any" value={form.longitude ?? ''} onChange={(e) => set({ longitude: e.target.value ? Number(e.target.value) : null })} /></Field>
            </div>
          </Panel>
        </aside>
      </div>
    </>
  );
}
