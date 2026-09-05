'use client';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiError, STATUSES, type AdminLocale, type MediaAssetOut, type VideoIn, type VideoOut } from '@/lib/admin/api';
import { Field, LocaleTabs, Panel, Toggle, useConfirm, useToast, useTranslationsState } from './ui';
import { AssetField } from './MediaPicker';

const BLANK = { title: '', subtitle: '', description: '' };

function VideoForm({ video, onSaved, onDeleted }: { video: VideoOut | null; onSaved: (v: VideoOut) => void; onDeleted?: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [locale, setLocale] = useState<AdminLocale>('mn');
  const { tr, update, missing, payload } = useTranslationsState(video?.translations, BLANK);
  const [url, setUrl] = useState(video?.youtube_id ? `https://www.youtube.com/watch?v=${video.youtube_id}` : '');
  const [poster, setPoster] = useState<MediaAssetOut | null>(video?.poster ?? null);
  const [featured, setFeatured] = useState(video?.featured ?? false);
  const [order, setOrder] = useState(video?.display_order ?? 0);
  const [status, setStatus] = useState<VideoIn['status']>(video?.status ?? 'draft');
  async function save() {
    try {
      const body: VideoIn = { youtube_url: url || null, poster_id: poster?.id ?? null, featured, display_order: order, status, sample: video?.sample ?? false, translations: payload };
      const saved = video ? await api<VideoOut>(`videos/${video.id}`, { method: 'PUT', json: body }) : await api<VideoOut>('videos', { method: 'POST', json: body });
      toast('ok', 'Saved.');
      onSaved(saved);
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Save failed');
    }
  }
  async function remove() {
    if (!video || !confirm('Delete this video?')) return;
    await api(`videos/${video.id}`, { method: 'DELETE' });
    onDeleted?.();
  }
  return (
    <Panel title={video ? tr.mn.title || tr.en.title || video.youtube_id || 'Video' : 'New video'} aside={video ? <span className={`status status-${video.status}`}>{video.status}</span> : undefined}>
      <div className="editor-layout" style={{ gridTemplateColumns: 'minmax(0,1fr) 240px' }}>
        <div>
          <LocaleTabs value={locale} onChange={setLocale} missing={missing} />
          <div className="form-grid">
            <Field label={`Title · ${locale.toUpperCase()}`} className="col-6"><input value={tr[locale].title} onChange={(e) => update(locale, { title: e.target.value })} /></Field>
            <Field label={`Subtitle · ${locale.toUpperCase()}`} className="col-6"><input value={tr[locale].subtitle} onChange={(e) => update(locale, { subtitle: e.target.value })} /></Field>
            <Field label={`Description · ${locale.toUpperCase()}`} className="col-12"><textarea value={tr[locale].description} onChange={(e) => update(locale, { description: e.target.value })} style={{ minHeight: 60 }} /></Field>
            <Field label="YouTube URL" className="col-8" hint="youtu.be, watch?v=, embed or shorts links are accepted; the id is validated on save"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" /></Field>
            <Field label="Status" className="col-2"><select value={status} onChange={(e) => setStatus(e.target.value as VideoIn['status'])}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
            <Field label="Order" className="col-2"><input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} /></Field>
            <div className="col-12" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Toggle checked={featured} onChange={setFeatured} label="Featured on homepage" />
              <button type="button" className="btn btn-sm btn-ivory" onClick={save} style={{ marginLeft: 'auto' }}>Save</button>
              {video && <button type="button" className="btn btn-sm btn-danger" onClick={remove}><Trash2 strokeWidth={1.5} /></button>}
            </div>
          </div>
        </div>
        <AssetField label="Poster (16:9)" value={poster} onChange={setPoster} wide />
      </div>
    </Panel>
  );
}

export default function VideosPanel({ initial }: { initial: VideoOut[] }) {
  const [videos, setVideos] = useState(initial);
  const [adding, setAdding] = useState(false);
  return (
    <>
      {adding && <VideoForm video={null} onSaved={(v) => { setVideos((l) => [v, ...l]); setAdding(false); }} />}
      {!adding && <button type="button" className="btn btn-sm btn-ivory" style={{ marginBottom: 20 }} onClick={() => setAdding(true)}><Plus strokeWidth={1.5} /> New video</button>}
      {videos.map((v) => (
        <VideoForm key={v.id + v.updated_at} video={v} onSaved={(s) => setVideos((l) => l.map((x) => (x.id === s.id ? s : x)))} onDeleted={() => setVideos((l) => l.filter((x) => x.id !== v.id))} />
      ))}
      {videos.length === 0 && !adding && <p className="meta">No videos yet.</p>}
    </>
  );
}
