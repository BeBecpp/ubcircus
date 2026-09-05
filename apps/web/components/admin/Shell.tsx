'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { CalendarDays, Clapperboard, FileText, Film, Globe, Image as ImageIcon, Inbox, LayoutDashboard, LayoutGrid, Map, Menu, Newspaper, Settings, Shield, Tags, Users } from 'lucide-react';
import { ToastProvider } from './ui';

const GROUPS: { title: string; items: { href: string; label: string; icon: ReactNode }[] }[] = [
  { title: 'Overview', items: [{ href: '/admin', label: 'Overview', icon: <LayoutDashboard strokeWidth={1.5} /> }] },
  { title: 'Programme', items: [{ href: '/admin/events', label: 'Events', icon: <Clapperboard strokeWidth={1.5} /> }, { href: '/admin/calendar', label: 'Calendar', icon: <CalendarDays strokeWidth={1.5} /> }, { href: '/admin/categories', label: 'Categories', icon: <Tags strokeWidth={1.5} /> }] },
  { title: 'Editorial', items: [{ href: '/admin/stories', label: 'Stories', icon: <Newspaper strokeWidth={1.5} /> }, { href: '/admin/pages', label: 'Pages', icon: <FileText strokeWidth={1.5} /> }] },
  { title: 'Media', items: [{ href: '/admin/media', label: 'Library', icon: <ImageIcon strokeWidth={1.5} /> }, { href: '/admin/galleries', label: 'Galleries', icon: <LayoutGrid strokeWidth={1.5} /> }, { href: '/admin/videos', label: 'Videos', icon: <Film strokeWidth={1.5} /> }] },
  { title: 'Site', items: [{ href: '/admin/homepage', label: 'Homepage', icon: <LayoutGrid strokeWidth={1.5} /> }, { href: '/admin/navigation', label: 'Navigation', icon: <Menu strokeWidth={1.5} /> }, { href: '/admin/visit', label: 'Visit', icon: <Map strokeWidth={1.5} /> }, { href: '/admin/seo', label: 'SEO', icon: <Globe strokeWidth={1.5} /> }] },
  { title: 'System', items: [{ href: '/admin/users', label: 'Users', icon: <Users strokeWidth={1.5} /> }, { href: '/admin/roles', label: 'Roles', icon: <Shield strokeWidth={1.5} /> }, { href: '/admin/messages', label: 'Messages', icon: <Inbox strokeWidth={1.5} /> }, { href: '/admin/settings', label: 'Settings', icon: <Settings strokeWidth={1.5} /> }] },
];

export default function Shell({ children, email, role, mode }: { children: ReactNode; email: string; role: string; mode: 'dev' | 'supabase' }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`));
  const crumbs = pathname.split('/').filter(Boolean).slice(1);
  async function signOut() {
    await fetch('/api/admin-auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    router.push('/admin/login');
    router.refresh();
  }
  return (
    <ToastProvider>
      <div className="bs">
        <aside className="bs-rail">
          <div className="bs-brand">
            <small>BACKSTAGE</small>
            <b>UB CIRCUS</b>
          </div>
          {GROUPS.map((g) => (
            <nav key={g.title} className="bs-group" aria-label={g.title}>
              <h4>{g.title}</h4>
              {g.items.map((item) => (
                <Link key={item.href} href={item.href} aria-current={current(item.href) ? 'page' : undefined}>
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          ))}
          <div className="bs-rail-foot">
            <div>
              <b title={email}>{email}</b>
              <span className={`status status-${role === 'admin' ? 'published' : 'draft'}`}>{role}{mode === 'dev' ? ' · dev session' : ''}</span>
            </div>
            <div className="row">
              <Link href="/mn" target="_blank" rel="noopener">View site ↗</Link>
              <button type="button" onClick={signOut}>Sign out</button>
            </div>
          </div>
        </aside>
        <div className="bs-main">
          <header className="bs-top">
            <div className="bs-crumbs">
              <span>Backstage</span>
              {crumbs.map((c, i) => (
                <span key={c + i}>/ {i === crumbs.length - 1 ? <b>{c.length > 20 ? 'edit' : c}</b> : c}</span>
              ))}
            </div>
            <div className="bs-actions" id="bs-actions" />
          </header>
          <div className="bs-content">{children}</div>
        </div>
      </div>
    </ToastProvider>
  );
}
