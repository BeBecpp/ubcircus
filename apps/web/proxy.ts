import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const devAllowed = Boolean(process.env.DEV_AUTH_TOKEN) && process.env.NODE_ENV !== 'production' && !process.env.VERCEL;

/** Optimistic gate for /admin: refreshes the Supabase session cookie and bounces anonymous visitors to the login page.
 *  Authorisation (staff role) is enforced by the API on every request; this only keeps the shell private. */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/admin/login') return NextResponse.next();
  if (devAllowed && request.cookies.get('ub_dev_session')?.value === '1') return NextResponse.next();
  if (!url || !key) {
    const login = request.nextUrl.clone();
    login.pathname = '/admin/login';
    login.searchParams.set('reason', 'unconfigured');
    return NextResponse.redirect(login);
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const login = request.nextUrl.clone();
    login.pathname = '/admin/login';
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = { matcher: ['/admin/:path*'] };
