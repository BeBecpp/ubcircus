'use client';
import { useState, type FormEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { copy, type Locale } from '@/lib/i18n';

type Errors = Partial<Record<'name' | 'email' | 'category' | 'message', string>>;
const CATEGORY_KEYS = { general: 'general', tickets: 'ticketsCat', partnership: 'partnership', press: 'press', venue: 'venueEvents' } as const;

export default function ContactForm({ locale, categories, demo }: { locale: Locale; categories: string[]; demo: boolean }) {
  const t = copy[locale];
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'error' | 'demo'>('idle');
  const [message, setMessage] = useState('');

  function validate(data: FormData): Errors {
    const e: Errors = {};
    if (!String(data.get('name') ?? '').trim()) e.name = t.required;
    const email = String(data.get('email') ?? '').trim();
    if (!email) e.email = t.required;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = t.invalidEmail;
    if (!String(data.get('category') ?? '')) e.category = t.required;
    if (String(data.get('message') ?? '').trim().length < 10) e.message = t.tooShort;
    return e;
  }

  async function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const data = new FormData(form);
    const e = validate(data);
    setErrors(e);
    if (Object.keys(e).length) {
      const first = form.querySelector<HTMLElement>('[data-invalid="true"] input, [data-invalid="true"] select, [data-invalid="true"] textarea');
      first?.focus();
      return;
    }
    if (demo) {
      setState('demo');
      return;
    }
    setState('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: data.get('name'), email: data.get('email'), category: data.get('category'), message: data.get('message'), website: data.get('website'), locale }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && body.ok) {
        setState('ok');
        form.reset();
        setMessage('');
      } else {
        setState(body.error === 'demo' ? 'demo' : 'error');
      }
    } catch {
      setState('error');
    }
  }

  const field = (name: keyof Errors, label: string, input: React.ReactNode) => (
    <div className="field" data-invalid={errors[name] ? 'true' : undefined}>
      <label htmlFor={`c-${name}`}>{label}</label>
      {input}
      {errors[name] && <span className="error" id={`c-${name}-error`} role="alert">{errors[name]}</span>}
    </div>
  );

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <div className="form-row">
        {field('name', t.name, <input id="c-name" name="name" autoComplete="name" aria-describedby={errors.name ? 'c-name-error' : undefined} required />)}
        {field('email', t.email, <input id="c-email" name="email" type="email" autoComplete="email" aria-describedby={errors.email ? 'c-email-error' : undefined} required />)}
      </div>
      {field(
        'category',
        t.contactCategory,
        <select id="c-category" name="category" defaultValue="" required aria-describedby={errors.category ? 'c-category-error' : undefined}>
          <option value="" disabled>—</option>
          {categories.map((c) => (
            <option key={c} value={c}>{t[CATEGORY_KEYS[c as keyof typeof CATEGORY_KEYS] ?? 'general']}</option>
          ))}
        </select>,
      )}
      {field('message', t.message, <textarea id="c-message" name="message" value={message} onChange={(e) => setMessage(e.target.value)} aria-describedby={errors.message ? 'c-message-error' : undefined} required minLength={10} />)}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="form-foot">
        <button className="btn btn-red" type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? t.sending : t.send}
          <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
        </button>
        <p className="form-status" data-state={state === 'ok' ? 'ok' : state === 'error' ? 'error' : undefined} aria-live="polite">
          {state === 'ok' && t.sent}
          {state === 'error' && t.sendError}
          {state === 'demo' && t.demoContact}
        </p>
      </div>
    </form>
  );
}
