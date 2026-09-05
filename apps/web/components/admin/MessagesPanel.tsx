'use client';
import { useState } from 'react';
import { api, ApiError, fmtDateTime, type ContactMessageOut } from '@/lib/admin/api';
import { useToast } from './ui';

export default function MessagesPanel({ initial }: { initial: ContactMessageOut[] }) {
  const toast = useToast();
  const [items, setItems] = useState(initial);
  async function resolve(id: string) {
    try {
      const saved = await api<ContactMessageOut>(`messages/${id}/resolve`, { method: 'POST' });
      setItems((l) => l.map((m) => (m.id === id ? saved : m)));
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Failed');
    }
  }
  return (
    <>
      <div className="bs-head"><div><p className="eyebrow">System · Messages</p><h1>Contact messages</h1><p>Submitted through the public contact form (rate-limited, honeypot-filtered).</p></div></div>
      <section className="panel">
        <table className="table">
          <thead><tr><th>Received</th><th>From</th><th>Topic</th><th>Message</th><th></th></tr></thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} style={{ opacity: m.resolved ? 0.5 : 1 }}>
                <td className="muted">{fmtDateTime(m.created_at)}</td>
                <td>{m.name}<br /><a className="muted" href={`mailto:${m.email}`}>{m.email}</a></td>
                <td className="muted">{m.category} · {m.locale}</td>
                <td style={{ maxWidth: 480, whiteSpace: 'pre-wrap' }}>{m.message}</td>
                <td className="actions">{m.resolved ? <span className="status status-published">resolved</span> : <button type="button" className="btn btn-sm" onClick={() => resolve(m.id)}>Resolve</button>}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="muted">No messages.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
