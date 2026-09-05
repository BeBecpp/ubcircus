import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin/session';

/** Called by Backstage after a successful mutation so public pages refresh immediately instead of waiting for ISR. */
export async function POST() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ detail: 'Not signed in' }, { status: 401 });
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true, revalidated: true });
}
