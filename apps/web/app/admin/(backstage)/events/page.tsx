import Link from 'next/link';
import { load } from '@/components/admin/Guarded';
import { fmtDate, titleOf } from '@/lib/admin/api';
import type { components } from '@/lib/api/schema';

type EventOut = components['schemas']['EventOut'];

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams;
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (q) params.set('q', q);
  const { data, error } = await load<EventOut[]>(`events?${params}`);
  const statuses = ['', 'draft', 'scheduled', 'published', 'cancelled', 'archived'];
  return (
    <>
      <div className="bs-head">
        <div>
          <p className="eyebrow">Programme</p>
          <h1>Events</h1>
          <p>Every production with its sessions. Only published events appear on the site.</p>
        </div>
        <Link className="btn btn-sm btn-ivory" href="/admin/events/new">New event</Link>
      </div>
      <form className="media-toolbar" method="get">
        <div className="filters">
          {statuses.map((s) => (
            <Link key={s || 'all'} href={s ? `/admin/events?status=${s}` : '/admin/events'} aria-current={(status ?? '') === s ? 'true' : undefined}>{s || 'All'}</Link>
          ))}
        </div>
        <div className="field" style={{ marginLeft: 'auto' }}>
          <input name="q" placeholder="Search title or slug…" defaultValue={q ?? ''} aria-label="Search" />
        </div>
      </form>
      {error ?? (
        <section className="panel">
          <table className="table">
            <thead>
              <tr><th></th><th>Title</th><th>Status</th><th>Category</th><th>Sessions</th><th>Next</th><th>Updated</th><th></th></tr>
            </thead>
            <tbody>
              {data!.length === 0 && <tr><td colSpan={8} className="muted">No events match.</td></tr>}
              {data!.map((e) => {
                const next = e.sessions.find((s) => new Date(s.starts_at) >= new Date());
                return (
                  <tr key={e.id}>
                    <td>{e.poster ? /* eslint-disable-next-line @next/next/no-img-element */ <img className="thumb" src={e.poster.url} alt="" /> : <span className="thumb" />}</td>
                    <td className="title"><Link href={`/admin/events/${e.id}`}>{titleOf(e)}</Link><br /><span className="muted">/{e.slug}{e.sample ? ' · sample' : ''}</span></td>
                    <td><span className={`status status-${e.status}`}>{e.status}</span></td>
                    <td className="muted">{e.category?.labels.en ?? e.category?.slug ?? '—'}</td>
                    <td className="num">{e.sessions.length}</td>
                    <td className="muted">{next ? fmtDate(next.starts_at) : '—'}</td>
                    <td className="muted">{fmtDate(e.updated_at)}</td>
                    <td className="actions"><Link className="btn btn-sm" href={`/admin/events/${e.id}`}>Edit</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
