'use client';
import { createBrowserClient } from '@supabase/ssr';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const supabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

/** Browser client with the publishable key only. Used for staff sign-in; content never goes through it. */
export function supabaseBrowser() {
  if (!supabaseConfigured) throw new Error('Supabase is not configured');
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
