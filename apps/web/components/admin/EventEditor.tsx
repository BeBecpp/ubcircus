'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowUpRight, Plus, Trash2, X } from 'lucide-react';
import { api, ApiError, fromLocalInput, slugify, STATUSES, toLocalInput, type AdminLocale, type CategoryOut, type EventIn, type EventOut, type MediaAssetOut, type VenueOut, type VideoOut } from '@/lib/admin/api';
import { Field, LocaleTabs, Panel, Sortable, StatusPill, Tabs, Toggle, useConfirm, useDirtyGuard, useToast, useTranslationsState } from './ui';
import MediaPicker, { AssetField } from './MediaPicker';
import RichText from './RichText';

type Tab = 'content' | 'schedule' | 'media' | 'tickets' | 'seo' | 'publishing';
type SessionForm = { key: string; id: string | null; starts_at: string; ends_at: string; status: 'scheduled' | 'sold_out' | 'cancelled'; ticket: null | { label: string; url: string; price: string; currency: string; note: string } };
const BLANK = { title: '', subtitle: '', excerpt: '', description: '', audience: '', seo_title: '', seo_description: '' };

export default function EventEditor({ initial, categories, venues, videos }: { initial: EventOut | null; categories: CategoryOut[]; venues: VenueOut[]; videos: VideoOut[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('content');
  const [locale, setLocale] = useState<AdminLocale>('mn');
  const { tr, update, missing, payload } = useTranslationsState(initial?.translations, BLANK);
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [status, setStatus] = useState<EventIn['status']>(initial?.status ?? 'draft');
  const [categoryId, setCategoryId] = useState(initial?.category?.id ?? '');
  const [venueId, setVenueId] = useState(initial?.venue?.id ?? venues[0]?.id ?? '');
  const [duration, setDuration] = useState(initial?.duration_minutes?.toString() ?? '');
  const [poster, setPoster] = useState<MediaAssetOut | null>(initial?.poster ?? null);
  const [hero, setHero] = useState<MediaAssetOut | null>(initial?.hero ?? null);
  const [gallery, setGallery] = useState<MediaAssetOut[]>(initial?.gallery ?? []);
  const [videoId, setVideoId] = useState(initial?.video?.id ?? '');
  const [sample, setSample] = useState(initial?.sample ?? false);
  const [publishedAt, setPublishedAt] = useState(toLocalInput(initial?.published_at));
  const [credits, setCredits] = useState<Record<AdminLocale, string>>({ mn: initial?.credits?.mn ?? '', en: initial?.credits?.en ?? '', tr: initial?.credits?.tr ?? '' });
  const [sessions, setSessions] = useState<SessionForm[]>(() => (initial?.sessions ?? []).map((s) => ({ key: s.id, id: s.id, starts_at: toLocalInput(s.starts_at), ends_at: toLocalInput(s.ends_at), status: s.status, ticket: s.ticket ? { label: s.ticket.label, url: s.ticket.url ?? '', price: s.ticket.price ?? '', currency: s.ticket.currency ?? '', note: s.ticket.note } : null })));
  const [pick, setPick] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useDirtyGuard(dirty);
  const mark = () => setDirty(true);

  const title = tr.mn.title || tr.en.title || tr.tr.title || (initial ? initial.slug : 'New event');
  const invalidSessions = useMemo(() => sessions.filter((s) => !s.starts_at || (s.ticket && s.ticket.url && !s.ticket.url.startsWith('https://'))), [sessions]);

  function build(override?: Partial<EventIn>): EventIn {
    return {
      slug: slug || slugify(tr.en.title || tr.mn.title),
      status,
      category_id: categoryId || null,
      venue_id: venueId || null,
      duration_minutes: duration ? Number(duration) : null,
      poster_id: poster?.id ?? null,
      hero_id: hero?.id ?? null,
      video_id: videoId || null,
      gallery_ids: gallery.map((g) => g.id),
      sample,
      credits: Object.fromEntries(Object.entries(credits).filter(([, v]) => v.trim())),
      published_at: publishedAt ? fromLocalInput(publishedAt) : null,
      translations: payload,
      sessions: sessions.map((s) => ({ id: s.id, starts_at: fromLocalInput(s.starts_at), ends_at: s.ends_at ? fromLocalInput(s.ends_at) : null, status: s.status, ticket: s.ticket ? { label: s.ticket.label || 'Tickets', url: s.ticket.url || null, price: s.ticket.price || null, currency: s.ticket.currency || null, note: s.ticket.note } : null })),
      ...override,
    };
  }

  async function save(override?: Partial<EventIn>) {
    if (!tr.mn.title.trim() && !tr.en.title.trim()) { toast('error', 'A title in Mongolian or English is required.'); setTab('content'); return; }
    if (invalidSessions.length) { toast('error', 'Every session needs a start time and ticket links must use https://'); setTab('schedule'); return; }
    setBusy(true);
    try {
      const body = build(override);
      const saved = initial ? await api<EventOut>(`events/${initial.id}`, { method: 'PUT', json: body }) : await api<EventOut>('events', { method: 'POST', json: body });
      setDirty(false);
      toast('ok', override?.status === 'published' ? 'Published.' : 'Saved.');
      if (!initial) router.replace(`/admin/events/${saved.id}`);
      else router.refresh();
      if (override?.status) setStatus(override.status);
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!initial || !confirm(`Delete “${title}” and all its sessions? This cannot be undone.`)) return;
    try {
      await api(`events/${initial.id}`, { method: 'DELETE' });
      toast('ok', 'Deleted.');
      router.push('/admin/events');
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Delete failed');
    }
  }
  const addSession = () => { setSessions((s) => [...s, { key: crypto.randomUUID(), id: null, starts_at: '', ends_at: '', status: 'scheduled', ticket: null }]); mark(); };
  const setSession = (key: string, patch: Partial<SessionForm>) => { setSessions((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s))); mark(); };
  const setTicket = (key: string, patch: Partial<NonNullable<SessionForm['ticket']>>) => setSessions((list) => list.map((s) => (s.key === key ? { ...s, ticket: { ...(s.ticket ?? { label: 'Tickets', url: '', price: '', currency: 'MNT', note: '' }), ...patch } } : s)));

  return (
    <>
      <div className="editor-head">
        <div>
          <p className="eyebrow">Programme · Event</p>
          <h1>{title}</h1>
          <div className="meta">
            <StatusPill value={status} />
            {initial && <span>/{initial.slug}</span>}
            {dirty && <span style={{ color: 'var(--brass)' }}>Unsaved changes</span>}
          </div>
        </div>
        <div className="bs-actions">
          {initial && (
            <Link className="btn btn-sm" href={`/mn/events/${initial.slug}`} target="_blank" rel="noopener">Preview <ArrowUpRight strokeWidth={1.5} /></Link>
          )}
          <button type="button" className="btn btn-sm" onClick={() => save()} disabled={busy}>Save</button>
          <button type="button" className="btn btn-sm btn-brass" onClick={() => save({ status: 'published' })} disabled={busy}>{status === 'published' ? 'Save & publish' : 'Publish'}</button>
        </div>
      </div>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'content', label: 'Content' }, { id: 'schedule', label: 'Schedule', count: sessions.length }, { id: 'media', label: 'Media', count: gallery.length + (poster ? 1 : 0) + (hero ? 1 : 0) }, { id: 'tickets', label: 'Tickets', count: sessions.filter((s) => s.ticket?.url).length }, { id: 'seo', label: 'SEO' }, { id: 'publishing', label: 'Publishing' }]} />

      {tab === 'content' && (
        <div className="editor-layout">
          <div>
            <LocaleTabs value={locale} onChange={setLocale} missing={missing} />
            <div className="form-grid">
              <Field label={`Title · ${locale.toUpperCase()}`} className="col-8">
                <input value={tr[locale].title} onChange={(e) => { update(locale, { title: e.target.value }); mark(); if (!slugTouched && locale === 'en') setSlug(slugify(e.target.value)); }} />
              </Field>
              <Field label="Slug" className="col-4" hint="Lowercase letters, numbers and hyphens">
                <input value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); mark(); }} />
              </Field>
              <Field label={`Subtitle · ${locale.toUpperCase()}`} className="col-12"><input value={tr[locale].subtitle} onChange={(e) => { update(locale, { subtitle: e.target.value }); mark(); }} /></Field>
              <Field label={`Excerpt · ${locale.toUpperCase()}`} className="col-12" hint="One or two sentences for listings"><textarea value={tr[locale].excerpt} onChange={(e) => { update(locale, { excerpt: e.target.value }); mark(); }} style={{ minHeight: 70 }} /></Field>
              <div className="col-12"><RichText label={`Description · ${locale.toUpperCase()}`} value={tr[locale].description} onChange={(v) => { update(locale, { description: v }); mark(); }} /></div>
              <Field label={`Audience · ${locale.toUpperCase()}`} className="col-6"><input value={tr[locale].audience} onChange={(e) => { update(locale, { audience: e.target.value }); mark(); }} placeholder="e.g. Ages 6+" /></Field>
              <Field label={`Credits · ${locale.toUpperCase()}`} className="col-12" hint="HTML allowed"><textarea value={credits[locale]} onChange={(e) => { setCredits((c) => ({ ...c, [locale]: e.target.value })); mark(); }} style={{ minHeight: 80 }} /></Field>
            </div>
          </div>
          <aside className="editor-side">
            <Panel title="Classification">
              <div className="form-grid">
                <Field label="Category" className="col-12">
                  <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); mark(); }}>
                    <option value="">—</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.labels.en ?? c.slug}</option>)}
                  </select>
                </Field>
                <Field label="Venue" className="col-12">
                  <select value={venueId} onChange={(e) => { setVenueId(e.target.value); mark(); }}>
                    <option value="">—</option>
                    {venues.map((v) => <option key={v.id} value={v.id}>{v.name.en ?? v.slug}</option>)}
                  </select>
                </Field>
                <Field label="Running time (minutes)" className="col-12"><input type="number" min={0} max={600} value={duration} onChange={(e) => { setDuration(e.target.value); mark(); }} /></Field>
              </div>
            </Panel>
          </aside>
        </div>
      )}

      {tab === 'schedule' && (
        <div>
          <p className="meta" style={{ marginBottom: 16 }}>One production, many sessions. Times are Ulaanbaatar local time.</p>
          <div className="repeater">
            {sessions.length === 0 && <div className="empty" style={{ padding: 28 }}><p style={{ fontSize: 18 }}>No sessions yet.</p></div>}
            {sessions.map((s, i) => (
              <div key={s.key} className="repeater-row">
                <span className="idx">{String(i + 1).padStart(2, '0')}</span>
                <Field label="Starts"><input type="datetime-local" value={s.starts_at} onChange={(e) => setSession(s.key, { starts_at: e.target.value })} required /></Field>
                <Field label="Ends (optional)"><input type="datetime-local" value={s.ends_at} onChange={(e) => setSession(s.key, { ends_at: e.target.value })} /></Field>
                <Field label="Status">
                  <select value={s.status} onChange={(e) => setSession(s.key, { status: e.target.value as SessionForm['status'] })}>
                    <option value="scheduled">Scheduled</option>
                    <option value="sold_out">Sold out</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </Field>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-sm btn-icon" title={s.ticket ? 'Remove ticket link' : 'Add ticket link'} onClick={() => { setSession(s.key, { ticket: s.ticket ? null : { label: 'Tickets', url: '', price: '', currency: 'MNT', note: '' } }); }}>{s.ticket ? <X strokeWidth={1.5} /> : <Plus strokeWidth={1.5} />}</button>
                  <button type="button" className="btn btn-sm btn-icon btn-danger" aria-label="Remove session" onClick={() => { setSessions((l) => l.filter((x) => x.key !== s.key)); mark(); }}><Trash2 strokeWidth={1.5} /></button>
                </div>
                {s.ticket && (
                  <div className="ticket">
                    <Field label="Label"><input value={s.ticket.label} onChange={(e) => setTicket(s.key, { label: e.target.value })} /></Field>
                    <Field label="Ticket URL (https)"><input value={s.ticket.url} onChange={(e) => setTicket(s.key, { url: e.target.value })} placeholder="https://…" /></Field>
                    <Field label="Price"><input value={s.ticket.price} onChange={(e) => setTicket(s.key, { price: e.target.value })} /></Field>
                    <Field label="Note"><input value={s.ticket.note} onChange={(e) => setTicket(s.key, { note: e.target.value })} /></Field>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-sm" style={{ marginTop: 14 }} onClick={addSession}><Plus strokeWidth={1.5} /> Add session</button>
        </div>
      )}

      {tab === 'media' && (
        <div className="editor-layout">
          <div className="form-grid">
            <div className="col-6"><AssetField label="Poster (3:4)" value={poster} onChange={(a) => { setPoster(a); mark(); }} /></div>
            <div className="col-6"><AssetField label="Hero image (16:9)" value={hero} onChange={(a) => { setHero(a); mark(); }} wide /></div>
            <Field label="Trailer / video" className="col-6">
              <select value={videoId} onChange={(e) => { setVideoId(e.target.value); mark(); }}>
                <option value="">—</option>
                {videos.map((v) => <option key={v.id} value={v.id}>{v.translations.mn?.title ?? v.translations.en?.title ?? v.youtube_id ?? v.id}</option>)}
              </select>
            </Field>
            <div className="col-12">
              <Field label={`Gallery · ${gallery.length} items`}>
                <Sortable items={gallery} keyOf={(g) => g.id} onChange={(g) => { setGallery(g); mark(); }} render={(g) => (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.url} alt="" style={{ width: 44, height: 44, objectFit: 'cover' }} />
                    <span style={{ fontSize: 12 }}>{g.file_name}<br /><span style={{ color: 'var(--muted)' }}>{g.width}×{g.height}</span></span>
                    <button type="button" className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => { setGallery((l) => l.filter((x) => x.id !== g.id)); mark(); }}>Remove</button>
                  </div>
                )} />
                <button type="button" className="btn btn-sm" style={{ marginTop: 12, justifySelf: 'start' }} onClick={() => setPick(true)}><Plus strokeWidth={1.5} /> Add images</button>
              </Field>
            </div>
          </div>
          <MediaPicker open={pick} multiple onClose={() => setPick(false)} initial={gallery.map((g) => g.id)} onPick={(assets) => { setGallery((cur) => [...cur, ...assets.filter((a) => !cur.some((c) => c.id === a.id))]); mark(); }} />
        </div>
      )}

      {tab === 'tickets' && (
        <div>
          <p className="meta" style={{ marginBottom: 16 }}>External booking links per session. Sample events never show purchase buttons publicly.</p>
          <section className="panel">
            <table className="table">
              <thead><tr><th>Session</th><th>Status</th><th>Label</th><th>URL</th><th>Price</th><th>Note</th></tr></thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.key}>
                    <td className="muted">{s.starts_at ? s.starts_at.replace('T', ' ') : '—'}</td>
                    <td><span className={`status status-${s.status}`}>{s.status.replace('_', ' ')}</span></td>
                    <td><input className="inline-input" value={s.ticket?.label ?? ''} placeholder="Tickets" onChange={(e) => { setTicket(s.key, { label: e.target.value }); mark(); }} /></td>
                    <td><input className="inline-input wide" value={s.ticket?.url ?? ''} placeholder="https://…" onChange={(e) => { setTicket(s.key, { url: e.target.value }); mark(); }} /></td>
                    <td><input className="inline-input narrow" value={s.ticket?.price ?? ''} onChange={(e) => { setTicket(s.key, { price: e.target.value }); mark(); }} /></td>
                    <td><input className="inline-input" value={s.ticket?.note ?? ''} onChange={(e) => { setTicket(s.key, { note: e.target.value }); mark(); }} /></td>
                  </tr>
                ))}
                {sessions.length === 0 && <tr><td colSpan={6} className="muted">Add sessions in the Schedule tab first.</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {tab === 'seo' && (
        <div className="editor-layout">
          <div>
            <LocaleTabs value={locale} onChange={setLocale} missing={missing} />
            <div className="form-grid">
              <Field label={`SEO title · ${locale.toUpperCase()}`} className="col-12" hint={`${tr[locale].seo_title.length}/70`}><input value={tr[locale].seo_title} onChange={(e) => { update(locale, { seo_title: e.target.value }); mark(); }} maxLength={240} /></Field>
              <Field label={`SEO description · ${locale.toUpperCase()}`} className="col-12" hint={`${tr[locale].seo_description.length}/160`}><textarea value={tr[locale].seo_description} onChange={(e) => { update(locale, { seo_description: e.target.value }); mark(); }} maxLength={400} style={{ minHeight: 80 }} /></Field>
            </div>
          </div>
          <aside className="editor-side">
            <Panel title="Search preview">
              <p style={{ fontFamily: 'var(--display)', fontSize: 18 }}>{tr[locale].seo_title || tr[locale].title || '—'} · UB CIRCUS</p>
              <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>{tr[locale].seo_description || tr[locale].excerpt || '—'}</p>
            </Panel>
          </aside>
        </div>
      )}

      {tab === 'publishing' && (
        <div className="editor-layout">
          <div className="form-grid">
            <Field label="Status" className="col-4">
              <select value={status} onChange={(e) => { setStatus(e.target.value as EventIn['status']); mark(); }}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Published at" className="col-4" hint="Set automatically on first publish"><input type="datetime-local" value={publishedAt} onChange={(e) => { setPublishedAt(e.target.value); mark(); }} /></Field>
            <div className="col-4" style={{ alignSelf: 'end' }}><Toggle checked={sample} onChange={(v) => { setSample(v); mark(); }} label="Sample content (no ticket sales)" /></div>
          </div>
          {initial && (
            <aside className="editor-side">
              <Panel title="Danger zone">
                <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 12 }}>Deleting removes the production, its sessions and ticket links. Media assets stay in the library.</p>
                <button type="button" className="btn btn-sm btn-danger" onClick={remove}><Trash2 strokeWidth={1.5} /> Delete event</button>
              </Panel>
            </aside>
          )}
        </div>
      )}
    </>
  );
}
