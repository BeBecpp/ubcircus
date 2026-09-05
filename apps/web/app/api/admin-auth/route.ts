import { NextResponse, type NextRequest } from 'next/server';
import { DEV_COOKIE, devSessionAllowed, getAdminSession } from '@/lib/admin/session';
import { supabaseConfigured, supabaseServer } from '@/lib/supabase/server';

/** GET → current admin session summary. POST {action:'dev-login'|'logout'} → manage the development session or sign out. */
export async function GET() {
  const session = await getAdminSession();
  return NextResponse.json({ signedIn: !!session, mode: session?.mode ?? null, email: session?.email ?? null, supabase: supabaseConfigured, dev: devSessionAllowed() });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action === 'dev-login') {
    if (!devSessionAllowed()) return NextResponse.json({ detail: 'Development sessions are disabled' }, { status: 403 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(DEV_COOKIE, '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 12 });
    return res;
  }
  if (body.action === 'logout') {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(DEV_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    if (supabaseConfigured) {
      const supabase = await supabaseServer();
      await supabase.auth.signOut();
    }
    return res;
  }
  return NextResponse.json({ detail: 'Unknown action' }, { status: 400 });
}
