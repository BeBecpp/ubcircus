'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiError, type NavigationItemIn, type NavigationItemOut } from '@/lib/admin/api';
import { Sortable, useDirtyGuard, useToast } from './ui';

type Row = { key: string; id: string | null; group: 'header' | 'footer'; href: string; label: Record<string, string>; external: boolean };

export default function NavigationEditor({ initial }: { initial: NavigationItemOut[] }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>(initial.map((n) => ({ key: n.id, id: n.id, group: n.group as Row['group'], href: n.href, label: { mn: '', en: '', tr: '', ...n.label }, external: n.external })));
  const [dirty, setDirty] = useState(false);
  useDirtyGuard(dirty);
  const mark = () => setDirty(true);
  const group = (g: Row['group']) => rows.filter((r) => r.group === g);
  const setGroup = (g: Row['group'], list: Row[]) => { setRows([...rows.filter((r) => r.group !== g), ...list]); mark(); };
  const edit = (key: string, patch: Partial<Row>) => { setRows((l) => l.map((r) => (r.key === key ? { ...r, ...patch } : r))); mark(); };
  async function save() {
    try {
      const body: NavigationItemIn[] = (['header', 'footer'] as const).flatMap((g) => group(g).map((r, i) => ({ id: r.id, group: g, href: r.href, label: r.label, display_order: i, parent_id: null, external: r.external })));
      await api('navigation', { method: 'PUT', json: body });
      setDirty(false);
      toast('ok', 'Navigation saved.');
      router.refresh();
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Save failed');
    }
  }
  const renderRow = (r: Row) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'center' }}>
      <input value={r.href} onChange={(e) => edit(r.key, { href: e.target.value })} placeholder="/events" className="inline-input" />
      {(['mn', 'en', 'tr'] as const).map((l) => <input key={l} value={r.label[l]} onChange={(e) => edit(r.key, { label: { ...r.label, [l]: e.target.value } })} placeholder={l.toUpperCase()} className="inline-input" />)}
      <button type="button" className="btn btn-sm btn-icon btn-danger" aria-label="Remove" onClick={() => { setRows((l) => l.filter((x) => x.key !== r.key)); mark(); }}><Trash2 strokeWidth={1.5} /></button>
    </div>
  );
  return (
    <>
      <div className="bs-head">
        <div><p className="eyebrow">Site · Navigation</p><h1>Navigation</h1><p>Header and footer links with labels per locale. Paths are locale-relative (e.g. /events).</p></div>
        <button type="button" className="btn btn-sm btn-brass" onClick={save}>Save navigation</button>
      </div>
      {(['header', 'footer'] as const).map((g) => (
        <section key={g} className="panel">
          <div className="panel-head"><b>{g}</b><button type="button" className="btn btn-sm" onClick={() => { setRows((l) => [...l, { key: crypto.randomUUID(), id: null, group: g, href: '/', label: { mn: '', en: '', tr: '' }, external: false }]); mark(); }}><Plus strokeWidth={1.5} /> Add link</button></div>
          <div className="panel-body">
            <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 12, padding: '0 12px 8px', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--dim)' }}><span /><span style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 36px', gap: 10 }}><span>Path</span><span>MN</span><span>EN</span><span>TR</span></span><span /></div>
            <Sortable items={group(g)} keyOf={(r) => r.key} onChange={(list) => setGroup(g, list)} render={renderRow} />
          </div>
        </section>
      ))}
    </>
  );
}
