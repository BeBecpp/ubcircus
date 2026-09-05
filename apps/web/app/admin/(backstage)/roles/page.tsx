import { load } from '@/components/admin/Guarded';
import type { components } from '@/lib/api/schema';

const CAPABILITIES: [string, boolean, boolean][] = [
  ['Edit and publish events, sessions and ticket links', true, true],
  ['Edit and publish stories and pages', true, true],
  ['Upload, replace and delete media', true, true],
  ['Curate the homepage and navigation', true, true],
  ['Edit visitor information (venue)', true, true],
  ['Read contact messages and mark them resolved', true, true],
  ['Change site settings and SEO defaults', false, true],
  ['Invite staff, change roles, deactivate accounts', false, true],
  ['Upload SVG files', false, true],
];

export default async function RolesPage() {
  const { data } = await load<components['schemas']['ProfileOut'][]>('users');
  const counts = { admin: data?.filter((u) => u.role === 'admin').length, editor: data?.filter((u) => u.role === 'editor').length };
  return (
    <>
      <div className="bs-head">
        <div><p className="eyebrow">System · Roles</p><h1>Roles</h1><p>Two roles, enforced server-side from the staff profile — never from user-editable metadata.</p></div>
      </div>
      <div className="stat-row" style={{ marginBottom: 20 }}>
        <div className="stat"><small>Administrators</small><b>{counts.admin ?? '—'}</b><span>full access</span></div>
        <div className="stat"><small>Editors</small><b>{counts.editor ?? '—'}</b><span>content only</span></div>
      </div>
      <section className="panel">
        <table className="table">
          <thead><tr><th>Capability</th><th>Editor</th><th>Admin</th></tr></thead>
          <tbody>
            {CAPABILITIES.map(([cap, editor, admin]) => (
              <tr key={cap}>
                <td>{cap}</td>
                <td className={editor ? 'status-published' : 'muted'}>{editor ? 'yes' : '—'}</td>
                <td className={admin ? 'status-published' : 'muted'}>{admin ? 'yes' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="meta" style={{ marginTop: 16 }}>Public visitors read published content only. Row Level Security in Supabase mirrors these rules for any direct database access.</p>
    </>
  );
}
