import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const supabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

/** Server client bound to the request cookies (server components, route handlers). */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          /* called from a server component: cookies are refreshed by proxy.ts instead */
        }
      },
    },
  });
}
