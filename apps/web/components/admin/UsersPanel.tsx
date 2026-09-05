'use client';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { api, ApiError, fmtDateTime, type ProfileOut } from '@/lib/admin/api';
import { Field, Panel, useConfirm, useToast } from './ui';

export default function UsersPanel({ initial, me, supabaseReady }: { initial: ProfileOut[]; me: ProfileOut | null; supabaseReady: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState(initial);
  const [invite, setInvite] = useState({ email: '', display_name: '', role: 'editor' as 'editor' | 'admin' });
  const isAdmin = me?.role === 'admin';

  async function sendInvite(e: FormEvent) {
    e.preventDefault();
    try {
      const created = await api<ProfileOut>('users/invite', { method: 'POST', json: invite });
      setUsers((u) => [...u, created]);
      setInvite({ email: '', display_name: '', role: 'editor' });
      toast('ok', `Invitation sent to ${created.email}.`);
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'Invite failed');
    }
  }
  async function update(id: string, patch: { role?: 'admin' | 'editor'; active?: boolean; display_name?: string }) {
    try {
      const saved = await api<ProfileOut>(`users/${id}`, { method: 'PUT', json: patch });
      setUsers((u) => u.map((x) => (x.id === id ? saved : x)));
      toast('ok', 'Updated.');
      router.refresh();
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'Update failed');
    }
  }
  async function remove(u: ProfileOut) {
    if (!confirm(`Remove ${u.email} from staff? Their Supabase account is deleted too.`)) return;
    try {
      await api(`users/${u.id}`, { method: 'DELETE' });
      setUsers((list) => list.filter((x) => x.id !== u.id));
      toast('ok', 'Removed.');
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'Delete failed');
    }
  }
  return (
    <>
      <div className="bs-head">
        <div><p className="eyebrow">System · Users</p><h1>Staff</h1><p>No public signup exists. Administrators invite colleagues; roles are enforced by the API on every request.</p></div>
      </div>
      {isAdmin && (
        <Panel title="Invite a colleague" aside={supabaseReady ? undefined : <span style={{ color: 'var(--red)' }}>Supabase Auth not configured</span>}>
          <form className="form-grid" onSubmit={sendInvite}>
            <Field label="Email" className="col-5"><input type="email" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} /></Field>
            <Field label="Display name" className="col-4"><input value={invite.display_name} onChange={(e) => setInvite({ ...invite, display_name: e.target.value })} /></Field>
            <Field label="Role" className="col-2"><select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as 'admin' | 'editor' })}><option value="editor">editor</option><option value="admin">admin</option></select></Field>
            <div className="col-1" style={{ alignSelf: 'end' }}><button className="btn btn-sm btn-ivory" type="submit" disabled={!supabaseReady}>Invite</button></div>
          </form>
        </Panel>
      )}
      <section className="panel" style={{ marginTop: 20 }}>
        <table className="table">
          <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Active</th><th>Last seen</th><th>Since</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}{u.id === me?.id && <span className="muted"> · you</span>}</td>
                <td className="muted">{u.display_name}</td>
                <td>{isAdmin && u.id !== me?.id ? <select value={u.role} onChange={(e) => update(u.id, { role: e.target.value as 'admin' | 'editor' })} className="inline-input" style={{ width: 100 }}><option value="editor">editor</option><option value="admin">admin</option></select> : <span className={`status status-${u.role === 'admin' ? 'published' : 'draft'}`}>{u.role}</span>}</td>
                <td>{isAdmin && u.id !== me?.id ? <label className="toggle"><input type="checkbox" checked={u.active} onChange={(e) => update(u.id, { active: e.target.checked })} /><i /></label> : <span className="muted">{u.active ? 'yes' : 'no'}</span>}</td>
                <td className="muted">{fmtDateTime(u.last_seen_at)}</td>
                <td className="muted">{fmtDateTime(u.created_at)}</td>
                <td className="actions">{isAdmin && u.id !== me?.id && <button type="button" className="btn btn-sm btn-icon btn-danger" aria-label="Remove" onClick={() => remove(u)}><Trash2 strokeWidth={1.5} /></button>}</td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={7} className="muted">No staff profiles yet. Add BOOTSTRAP_ADMIN_EMAILS to the API and sign in once.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
