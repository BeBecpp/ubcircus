import 'server-only';
import { cookies } from 'next/headers';
import { supabaseConfigured, supabaseServer } from '@/lib/supabase/server';

export const DEV_COOKIE = 'ub_dev_session';
const apiBase = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

/** Static development session: only when DEV_AUTH_TOKEN is set, never in production builds or on Vercel. */
export function devSessionAllowed() {
  return Boolean(process.env.DEV_AUTH_TOKEN) && process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
}

export type AdminSession = { mode: 'dev' | 'supabase'; token: string; email: string };

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  if (devSessionAllowed() && store.get(DEV_COOKIE)?.value === '1') {
    return { mode: 'dev', token: process.env.DEV_AUTH_TOKEN!, email: 'dev@ubcircus.local' };
  }
  if (!supabaseConfigured) return null;
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return null;
  return { mode: 'supabase', token, email: userData.user.email ?? '' };
}

export class AdminApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}

/** Server-side call to the FastAPI admin surface with the current staff token. */
export async function adminFetch<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const session = await getAdminSession();
  if (!session) throw new AdminApiError(401, 'Not signed in');
  if (!apiBase) throw new AdminApiError(503, 'API_URL is not configured');
  const res = await fetch(`${apiBase}/api/v1/admin/${path.replace(/^\//, '')}`, {
    ...init,
    cache: 'no-store',
    headers: { authorization: `Bearer ${session.token}`, accept: 'application/json', ...(init.json !== undefined ? { 'content-type': 'application/json' } : {}), ...(init.headers ?? {}) },
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new AdminApiError(res.status, typeof data?.detail === 'string' ? data.detail : res.statusText, data?.detail);
  return data as T;
}

export const apiConfigured = Boolean(apiBase);
