import { redirect } from 'next/navigation';
import Shell from '@/components/admin/Shell';
import { AdminApiError, adminFetch, apiConfigured, getAdminSession } from '@/lib/admin/session';
import type { components } from '@/lib/api/schema';

export const dynamic = 'force-dynamic';

export default async function BackstageLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  let role = 'editor';
  let email = session.email;
  if (apiConfigured) {
    try {
      const me = await adminFetch<components['schemas']['ProfileOut']>('me');
      role = me.role;
      email = me.email;
    } catch (error) {
      if (error instanceof AdminApiError && (error.status === 401 || error.status === 403)) redirect(`/admin/login?reason=${error.status === 403 ? 'forbidden' : 'expired'}`);
      role = 'unknown';
    }
  }
  return (
    <Shell email={email} role={role} mode={session.mode}>
      {children}
    </Shell>
  );
}
