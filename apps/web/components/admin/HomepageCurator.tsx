'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowUpRight, Plus, X } from 'lucide-react';
import { api, ApiError, titleOf, type ArticleOut, type EventOut, type HomepageSectionIn, type HomepageSectionOut, type MediaAssetOut, type VideoOut } from '@/lib/admin/api';
import { Field, Sortable, Toggle, useDirtyGuard, useToast } from './ui';
import MediaPicker from './MediaPicker';

const LABELS: Record<string, string> = { hero_orbit: 'Hero orbit', next_on_stage: 'Next on stage', featured_performances: 'Featured performances', whats_on: "What's on", featured_video: 'Featured film', in_motion: 'The circus in motion', stories: 'Stories from behind the curtain', about_feature: 'About feature', plan_your_visit: 'Plan your visit' };
const RESOURCE: Record<string, 'event' | 'article' | 'video' | 'media' | null> = { hero_orbit: 'event', next_on_stage: 'event', featured_performances: 'event', whats_on: null, featured_video: 'video', in_motion: 'media', stories: 'article', about_feature: null, plan_your_visit: null };
type Section = { kind: string; enabled: boolean; settings: Record<string, unknown>; items: { resource: string; resource_id: string }[] };

export default function HomepageCurator({ initial, events, articles, videos, media }: { initial: HomepageSectionOut[]; events: EventOut[]; articles: ArticleOut[]; videos: VideoOut[]; media: MediaAssetOut[] }) {
  const router = useRouter();
  const toast = useToast();
  const [sections, setSections] = useState<Section[]>(initial.map((s) => ({ kind: s.kind, enabled: s.enabled, settings: s.settings ?? {}, items: s.items.map((i) => ({ resource: i.resource, resource_id: i.resource_id })) })));
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  useDirtyGuard(dirty);
  const mark = () => setDirty(true);
  const byId = {
    event: new Map(events.map((e) => [e.id, titleOf(e)])),
    article: new Map(articles.map((a) => [a.id, titleOf(a)])),
    video: new Map(videos.map((v) => [v.id, v.translations.mn?.title ?? v.translations.en?.title ?? v.youtube_id ?? 'Video'])),
    media: new Map(media.map((m) => [m.id, m.file_name])),
  };
  const patch = (kind: string, fn: (s: Section) => Section) => { setSections((l) => l.map((s) => (s.kind === kind ? fn(s) : s))); mark(); };
  const addItem = (kind: string, id: string) => patch(kind, (s) => (s.items.some((i) => i.resource_id === id) ? s : { ...s, items: [...s.items, { resource: RESOURCE[kind]!, resource_id: id }] }));

  async function save() {
    try {
      const body: HomepageSectionIn[] = sections.map((s, i) => ({ kind: s.kind, enabled: s.enabled, display_order: i, settings: s.settings, items: s.items.map((it) => ({ resource: it.resource as HomepageSectionIn['items'][number]['resource'], resource_id: it.resource_id })) }));
      await api('homepage', { method: 'PUT', json: body });
      setDirty(false);
      toast('ok', 'Homepage saved. Public pages refresh within five minutes.');
      router.refresh();
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Save failed');
    }
  }
  const setSetting = (kind: string, key: string, value: unknown) => patch(kind, (s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
  const trSetting = (kind: string, key: string, locale: string, value: string) => patch(kind, (s) => ({ ...s, settings: { ...s.settings, [key]: { ...((s.settings[key] as Record<string, string>) ?? {}), [locale]: value } } }));
  const tr = (s: Section, key: string, locale: string) => ((s.settings[key] as Record<string, string> | undefined)?.[locale] ?? '');

  return (
    <>
      <div className="bs-head">
        <div><p className="eyebrow">Site · Homepage</p><h1>Homepage curator</h1><p>Order sections, switch them on or off and choose what each one features. No code changes needed.</p></div>
        <div className="bs-actions">
          <Link className="btn btn-sm" href="/mn" target="_blank" rel="noopener">Preview <ArrowUpRight strokeWidth={1.5} /></Link>
          <button type="button" className="btn btn-sm btn-brass" onClick={save}>Save homepage</button>
        </div>
      </div>
      <Sortable items={sections} keyOf={(s) => s.kind} onChange={(l) => { setSections(l); mark(); }} render={(s) => {
        const resource = RESOURCE[s.kind];
        const options = resource === 'event' ? events.map((e) => [e.id, titleOf(e), e.status] as const) : resource === 'article' ? articles.map((a) => [a.id, titleOf(a), a.status] as const) : resource === 'video' ? videos.map((v) => [v.id, byId.video.get(v.id)!, v.status] as const) : [];
        return (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <b style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 400 }}>{LABELS[s.kind] ?? s.kind}</b>
              <span className="meta">{s.kind}</span>
              <span style={{ marginLeft: 'auto' }}><Toggle checked={s.enabled} onChange={(v) => patch(s.kind, (x) => ({ ...x, enabled: v }))} label={s.enabled ? 'Shown' : 'Hidden'} /></span>
            </div>
            {resource && (
              <div>
                <div className="chips">
                  {s.items.map((it) => (
                    <span key={it.resource_id} className="chip">
                      {resource === 'media' && /* eslint-disable-next-line @next/next/no-img-element */ <img src={media.find((m) => m.id === it.resource_id)?.url} alt="" />}
                      {byId[resource].get(it.resource_id) ?? it.resource_id.slice(0, 8)}
                      <button type="button" aria-label="Remove" onClick={() => patch(s.kind, (x) => ({ ...x, items: x.items.filter((i) => i.resource_id !== it.resource_id) }))}><X strokeWidth={1.5} /></button>
                    </span>
                  ))}
                  {resource === 'media' ? (
                    <button type="button" className="chip" onClick={() => setPickFor(s.kind)}><Plus size={12} strokeWidth={1.5} /> Add images</button>
                  ) : (
                    <select className="chip inline-input" style={{ width: 'auto' }} value="" onChange={(e) => e.target.value && addItem(s.kind, e.target.value)}>
                      <option value="">+ Add {resource}</option>
                      {options.filter(([id]) => !s.items.some((i) => i.resource_id === id)).map(([id, label, status]) => <option key={id} value={id}>{label}{status !== 'published' ? ` (${status})` : ''}</option>)}
                    </select>
                  )}
                </div>
                {s.kind === 'next_on_stage' && <p className="hint" style={{ marginTop: 6, fontSize: 11, color: 'var(--dim)' }}>Leave empty to list the next sessions automatically.</p>}
                {s.items.length > 1 && (
                  <details style={{ marginTop: 8 }}>
                    <summary className="meta" style={{ cursor: 'pointer' }}>Reorder items</summary>
                    <div style={{ marginTop: 8 }}>
                      <Sortable items={s.items} keyOf={(i) => i.resource_id} onChange={(items) => patch(s.kind, (x) => ({ ...x, items }))} render={(i) => <span style={{ fontSize: 12 }}>{byId[resource].get(i.resource_id)}</span>} />
                    </div>
                  </details>
                )}
              </div>
            )}
            {(s.kind === 'next_on_stage' || s.kind === 'whats_on') && (
              <Field label="Limit" className="col-3"><input type="number" min={1} max={12} value={Number(s.settings.limit ?? (s.kind === 'whats_on' ? 8 : 4))} onChange={(e) => setSetting(s.kind, 'limit', Number(e.target.value))} style={{ width: 80 }} /></Field>
            )}
            {s.kind === 'hero_orbit' && (
              <div className="form-grid">{['mn', 'en', 'tr'].map((l) => <Field key={l} label={`Caption · ${l.toUpperCase()}`} className="col-4"><input value={tr(s, 'caption', l)} onChange={(e) => trSetting(s.kind, 'caption', l, e.target.value)} /></Field>)}</div>
            )}
            {s.kind === 'about_feature' && (
              <div className="form-grid">
                <Field label="Year label" className="col-3"><input value={String(s.settings.year_label ?? '')} onChange={(e) => setSetting(s.kind, 'year_label', e.target.value)} /></Field>
                {['mn', 'en', 'tr'].map((l) => <Field key={l} label={`Year caption · ${l.toUpperCase()}`} className="col-3"><input value={tr(s, 'year_caption', l)} onChange={(e) => trSetting(s.kind, 'year_caption', l, e.target.value)} /></Field>)}
                {['mn', 'en', 'tr'].map((l) => <Field key={l} label={`Title · ${l.toUpperCase()}`} className="col-4"><input value={tr(s, 'title', l)} onChange={(e) => trSetting(s.kind, 'title', l, e.target.value)} /></Field>)}
                {['mn', 'en', 'tr'].map((l) => <Field key={l} label={`Body · ${l.toUpperCase()}`} className="col-4"><textarea value={tr(s, 'body', l)} onChange={(e) => trSetting(s.kind, 'body', l, e.target.value)} style={{ minHeight: 70 }} /></Field>)}
                <Field label="Image" className="col-6">
                  <div className="chips">
                    {s.settings.image_id ? <span className="chip">{byId.media.get(String(s.settings.image_id)) ?? 'image'}<button type="button" aria-label="Remove" onClick={() => setSetting(s.kind, 'image_id', null)}><X strokeWidth={1.5} /></button></span> : null}
                    <button type="button" className="chip" onClick={() => setPickFor('about_feature')}><Plus size={12} strokeWidth={1.5} /> Choose</button>
                  </div>
                </Field>
                <Field label="Link" className="col-3"><input value={String(s.settings.href ?? '/about')} onChange={(e) => setSetting(s.kind, 'href', e.target.value)} /></Field>
              </div>
            )}
          </div>
        );
      }} />
      <MediaPicker open={pickFor !== null} multiple={pickFor === 'in_motion'} onClose={() => setPickFor(null)} onPick={(assets) => { if (pickFor === 'about_feature') setSetting('about_feature', 'image_id', assets[0]?.id ?? null); else if (pickFor) for (const a of assets) addItem(pickFor, a.id); }} />
    </>
  );
}
