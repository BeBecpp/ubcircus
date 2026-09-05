'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiError, slugify, type CategoryOut } from '@/lib/admin/api';
import { Field, useConfirm, useToast } from './ui';

export default function CategoriesPanel({ kind, initial }: { kind: 'event' | 'article'; initial: CategoryOut[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState(initial.map((c) => ({ ...c, labels: { mn: c.labels.mn ?? '', en: c.labels.en ?? '', tr: c.labels.tr ?? '' } })));
  const [draft, setDraft] = useState({ slug: '', mn: '', en: '', tr: '' });

  async function save(c: (typeof rows)[number]) {
    try {
      await api(`categories/${c.id}?kind=${kind}`, { method: 'PUT', json: { slug: c.slug, labels: c.labels, display_order: c.display_order } });
      toast('ok', 'Saved.');
      router.refresh();
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Save failed');
    }
  }
  async function create() {
    if (!draft.slug || !draft.mn) { toast('error', 'Slug and Mongolian label are required.'); return; }
    try {
      const created = await api<CategoryOut>(`categories?kind=${kind}`, { method: 'POST', json: { slug: draft.slug, labels: { mn: draft.mn, en: draft.en, tr: draft.tr }, display_order: rows.length } });
      setRows((r) => [...r, { ...created, labels: { mn: created.labels.mn ?? '', en: created.labels.en ?? '', tr: created.labels.tr ?? '' } }]);
      setDraft({ slug: '', mn: '', en: '', tr: '' });
      toast('ok', 'Category created.');
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Create failed');
    }
  }
  async function remove(id: string) {
    if (!confirm('Delete this category? Items keep their content but lose the category.')) return;
    try {
      await api(`categories/${id}?kind=${kind}`, { method: 'DELETE' });
      setRows((r) => r.filter((c) => c.id !== id));
      toast('ok', 'Deleted.');
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Delete failed');
    }
  }
  const edit = (id: string, patch: Partial<(typeof rows)[number]>) => setRows((r) => r.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  return (
    <section className="panel">
      <div className="panel-head"><b>{kind === 'event' ? 'Event categories' : 'Story categories'}</b><span>{rows.length}</span></div>
      <table className="table">
        <thead><tr><th>Slug</th><th>MN</th><th>EN</th><th>TR</th><th>Order</th><th></th></tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td><input value={c.slug} onChange={(e) => edit(c.id, { slug: slugify(e.target.value) })} className="inline-input" /></td>
              <td><input value={c.labels.mn} onChange={(e) => edit(c.id, { labels: { ...c.labels, mn: e.target.value } })} className="inline-input" /></td>
              <td><input value={c.labels.en} onChange={(e) => edit(c.id, { labels: { ...c.labels, en: e.target.value } })} className="inline-input" /></td>
              <td><input value={c.labels.tr} onChange={(e) => edit(c.id, { labels: { ...c.labels, tr: e.target.value } })} className="inline-input" /></td>
              <td><input type="number" value={c.display_order} onChange={(e) => edit(c.id, { display_order: Number(e.target.value) })} className="inline-input narrow" /></td>
              <td className="actions">
                <button type="button" className="btn btn-sm" onClick={() => save(c)}>Save</button>{' '}
                <button type="button" className="btn btn-sm btn-icon btn-danger" onClick={() => remove(c.id)} aria-label="Delete"><Trash2 strokeWidth={1.5} /></button>
              </td>
            </tr>
          ))}
          <tr>
            <td><input placeholder="new-slug" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })} className="inline-input" /></td>
            <td><input placeholder="Монгол" value={draft.mn} onChange={(e) => setDraft({ ...draft, mn: e.target.value })} className="inline-input" /></td>
            <td><input placeholder="English" value={draft.en} onChange={(e) => setDraft({ ...draft, en: e.target.value })} className="inline-input" /></td>
            <td><input placeholder="Türkçe" value={draft.tr} onChange={(e) => setDraft({ ...draft, tr: e.target.value })} className="inline-input" /></td>
            <td></td>
            <td className="actions"><button type="button" className="btn btn-sm btn-ivory" onClick={create}><Plus strokeWidth={1.5} /> Add</button></td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
export { Field };
