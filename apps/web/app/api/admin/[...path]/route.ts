import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/admin/session';

const apiBase = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

/** Same-origin proxy for the admin UI → FastAPI. Attaches the staff token server-side so it never lives in page JS. */
async function forward(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ detail: 'Not signed in' }, { status: 401 });
  if (!apiBase) return NextResponse.json({ detail: 'API_URL is not configured' }, { status: 503 });
  const { path } = await params;
  const target = new URL(`${apiBase}/api/v1/admin/${path.map(encodeURIComponent).join('/')}`);
  request.nextUrl.searchParams.forEach((v, k) => target.searchParams.append(k, v));
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
  const upstream = await fetch(target, {
    method: request.method,
    headers: { authorization: `Bearer ${session.token}`, accept: 'application/json', ...(body ? { 'content-type': request.headers.get('content-type') ?? 'application/json' } : {}) },
    body,
    cache: 'no-store',
  });
  const text = await upstream.text();
  return new NextResponse(text, { status: upstream.status, headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' } });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const DELETE = forward;
export const PATCH = forward;
