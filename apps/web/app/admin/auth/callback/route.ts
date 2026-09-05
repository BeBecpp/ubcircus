import { NextResponse, type NextRequest } from 'next/server';
import { supabaseConfigured, supabaseServer } from '@/lib/supabase/server';

/** Magic-link / OAuth code exchange for staff sign-in. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next') ?? '/admin';
  const target = next.startsWith('/admin') ? next : '/admin';
  if (code && supabaseConfigured) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(target, request.url));
  }
  return NextResponse.redirect(new URL('/admin/login?reason=expired', request.url));
}
