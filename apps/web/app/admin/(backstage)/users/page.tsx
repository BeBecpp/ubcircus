import UsersPanel from '@/components/admin/UsersPanel';
import { load } from '@/components/admin/Guarded';
import type { components } from '@/lib/api/schema';

type S = components['schemas'];

export default async function UsersPage() {
  const [me, users] = await Promise.all([load<S['ProfileOut']>('me'), load<S['ProfileOut'][]>('users')]);
  if (me.error) return me.error;
  let supabaseReady = false;
  try {
    const health = await fetch(`${(process.env.API_URL ?? '').replace(/\/$/, '')}/health`, { cache: 'no-store' }).then((r) => r.json());
    supabaseReady = health.supabase === 'configured';
  } catch {
    supabaseReady = false;
  }
  if (users.error && me.data?.role !== 'admin') {
    return (
      <>
        <div className="bs-head"><div><p className="eyebrow">System · Users</p><h1>Staff</h1><p>Only administrators can view and manage staff accounts.</p></div></div>
        <UsersPanel initial={me.data ? [me.data] : []} me={me.data} supabaseReady={supabaseReady} />
      </>
    );
  }
  return <UsersPanel initial={users.data ?? []} me={me.data} supabaseReady={supabaseReady} />;
}
