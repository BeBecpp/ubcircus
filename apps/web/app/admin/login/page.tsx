import { Suspense } from 'react';
import LoginForm from '@/components/admin/LoginForm';
import { devSessionAllowed } from '@/lib/admin/session';
import { supabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="login">
      <section className="login-art" aria-hidden="true">
        <div className="ring" />
        <div>
          <h1>Backstage</h1>
          <p>The control room for UB CIRCUS: programme, editorial, media and the homepage. Staff access only.</p>
        </div>
      </section>
      <section className="login-form">
        <Suspense fallback={null}>
          <LoginForm supabase={supabaseConfigured} dev={devSessionAllowed()} />
        </Suspense>
      </section>
    </main>
  );
}
