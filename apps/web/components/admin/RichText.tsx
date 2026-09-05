'use client';
import { useRef, useState } from 'react';
import MediaPicker from './MediaPicker';

/** Editorial HTML editor: a code textarea with formatting helpers and a live preview.
 *  Output is sanitised again by the API, so the allowed vocabulary is small and predictable. */
export default function RichText({ value, onChange, label = 'Body' }: { value: string; onChange: (v: string) => void; label?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [pick, setPick] = useState(false);

  const wrap = (before: string, after = '') => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const inner = value.slice(s, e);
    const next = `${value.slice(0, s)}${before}${inner}${after}${value.slice(e)}`;
    onChange(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + before.length, s + before.length + inner.length); });
  };
  const insert = (snippet: string) => {
    const el = ref.current;
    const at = el ? el.selectionEnd : value.length;
    onChange(`${value.slice(0, at)}\n${snippet}\n${value.slice(at)}`);
  };
  const tools: [string, () => void][] = [
    ['P', () => wrap('<p>', '</p>')],
    ['Lede', () => wrap('<p class="lede">', '</p>')],
    ['H2', () => wrap('<h2>', '</h2>')],
    ['H3', () => wrap('<h3>', '</h3>')],
    ['B', () => wrap('<strong>', '</strong>')],
    ['I', () => wrap('<em>', '</em>')],
    ['Link', () => wrap('<a href="https://">', '</a>')],
    ['Quote', () => insert('<blockquote><p>Quotation</p><cite>Source</cite></blockquote>')],
    ['List', () => insert('<ul>\n  <li>Item</li>\n</ul>')],
    ['Video', () => insert('<p><a href="https://www.youtube.com/watch?v=">Watch the video</a></p>')],
    ['Image', () => setPick(true)],
  ];
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {tools.map(([name, fn]) => (
          <button key={name} type="button" className="btn btn-sm" style={{ minHeight: 30, padding: '0 10px' }} onClick={fn}>{name}</button>
        ))}
        <button type="button" className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto', minHeight: 30 }} onClick={() => setPreview((p) => !p)}>{preview ? 'Edit HTML' : 'Preview'}</button>
      </div>
      {preview ? (
        <div className="prose" style={{ border: '1px solid var(--line)', padding: 20, fontSize: 15 }} dangerouslySetInnerHTML={{ __html: value || '<p style="color:var(--dim)">Nothing to preview.</p>' }} />
      ) : (
        <textarea ref={ref} className="code" value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} />
      )}
      <span className="hint">Allowed: p, h2, h3, strong, em, a, blockquote, cite, ul/ol/li, figure with data-media, img. Everything else is stripped on save.</span>
      <MediaPicker open={pick} onClose={() => setPick(false)} onPick={(assets) => { for (const a of assets) insert(`<figure data-media="${a.id}"><figcaption>${a.alt?.en ?? a.file_name}</figcaption></figure>`); }} />
    </div>
  );
}
