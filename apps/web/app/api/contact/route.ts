import { NextResponse } from 'next/server';
import { content, isDemo } from '@/lib/content';
import { isLocale } from '@/lib/i18n';

/** Public contact endpoint: validates, drops honeypot submissions, forwards to the API which rate-limits and stores. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }
  const name = String(body.name ?? '').trim().slice(0, 160);
  const email = String(body.email ?? '').trim().slice(0, 254);
  const category = String(body.category ?? '').trim().slice(0, 40);
  const message = String(body.message ?? '').trim().slice(0, 4000);
  const website = String(body.website ?? '');
  const locale = isLocale(String(body.locale)) ? (String(body.locale) as 'mn' | 'en' | 'tr') : 'mn';
  if (website) return NextResponse.json({ ok: true }); // honeypot: pretend success
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !category || message.length < 10) {
    return NextResponse.json({ ok: false, error: 'validation' }, { status: 422 });
  }
  if (isDemo) return NextResponse.json({ ok: false, error: 'demo' }, { status: 503 });
  const result = await content.contact({ name, email, category, message, locale });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
