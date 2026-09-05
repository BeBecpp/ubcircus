'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function LoginForm({ supabase, dev }: { supabase: boolean; dev: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') && params.get('next')!.startsWith('/admin') ? params.get('next')! : '/admin';
  const reason = params.get('reason');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setState('busy');
    setMessage('');
    try {
      const client = supabaseBrowser();
      if (password) {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/admin/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: false } });
        if (error) throw error;
        setState('sent');
      }
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Sign-in failed');
    }
  }
  async function devLogin() {
    setState('busy');
    const res = await fetch('/api/admin-auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'dev-login' }) });
    if (res.ok) {
      router.push(next);
      router.refresh();
    } else {
      setState('error');
      setMessage('Development session refused');
    }
  }

  return (
    <div>
      <p className="eyebrow" style={{ marginBottom: 14 }}>Staff sign in</p>
      <h2>Welcome back</h2>
      {reason === 'forbidden' && <p className="form-status" data-state="error" style={{ marginBottom: 18 }}>This account has no staff profile. Ask an administrator for an invitation.</p>}
      {reason === 'expired' && <p className="form-status" style={{ marginBottom: 18 }}>Your session expired. Please sign in again.</p>}
      {reason === 'unconfigured' && !dev && <p className="form-status" data-state="error" style={{ marginBottom: 18 }}>Supabase authentication is not configured for this deployment.</p>}
      {supabase ? (
        state === 'sent' ? (
          <p className="form-status" data-state="ok">A sign-in link has been sent to {email}. Open it on this device.</p>
        ) : (
          <form className="form" onSubmit={signIn}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="password">Password <span style={{ color: 'var(--dim)', letterSpacing: 0 }}>(leave empty for a magic link)</span></label>
              <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="form-foot">
              <button className="btn btn-ivory" type="submit" disabled={state === 'busy'}>
                {password ? 'Sign in' : 'Send magic link'}
                <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
              </button>
              {state === 'error' && <span className="form-status" data-state="error">{message}</span>}
            </div>
          </form>
        )
      ) : null}
      {dev && (
        <div style={{ marginTop: supabase ? 28 : 0 }}>
          <button type="button" className="btn" onClick={devLogin} disabled={state === 'busy'}>Start development session</button>
          <p className="login-note">Local development only: uses DEV_AUTH_TOKEN against the API. Disabled in production builds and on Vercel.</p>
        </div>
      )}
      <p className="login-note">There is no public signup. Staff accounts are created by invitation from Users → Invite.</p>
    </div>
  );
}
