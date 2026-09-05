import { AdminApiError, adminFetch, apiConfigured } from '@/lib/admin/session';

/** Server helper: fetch admin data or render a designed failure state. */
export async function load<T>(path: string): Promise<{ data: T; error: null } | { data: null; error: React.ReactNode }> {
  if (!apiConfigured) return { data: null, error: <div className="empty"><p>The API is not connected.</p><small>Set API_URL for this deployment.</small></div> };
  try {
    return { data: await adminFetch<T>(path), error: null };
  } catch (error) {
    const message = error instanceof AdminApiError ? `${error.status} · ${error.message}` : error instanceof Error ? error.message : 'Unknown error';
    return { data: null, error: <div className="empty"><p>Backstage could not reach the API.</p><small>{message}</small></div> };
  }
}
