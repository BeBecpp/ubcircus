import Link from 'next/link';
import { AdminApiError, adminFetch, apiConfigured } from '@/lib/admin/session';
import type { components } from '@/lib/api/schema';
import RingSignature from '@/components/admin/RingSignature';
import { fmtDateTime, titleOf } from '@/lib/admin/api';

type Dashboard = components['schemas']['DashboardOut'];

export default async function Overview() {
  if (!apiConfigured) return <ApiMissing />;
  let dash: Dashboard;
  try {
    dash = await adminFetch<Dashboard>('dashboard');
  } catch (error) {
    return <ApiDown error={error} />;
  }
  const next = dash.next_performance;
  return (
    <>
      <div className="bs-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Control room</h1>
          <p>What is on stage next, what is unpublished, and what changed recently.</p>
        </div>
        <Link className="btn btn-sm btn-ivory" href="/admin/events/new">New event</Link>
      </div>
      <div className="stat-row">
        <div className="stat">
          <small>Next performance</small>
          <b style={{ fontSize: 22 }}>{next ? titleOf(next.event) : '—'}</b>
          <span>{next ? fmtDateTime(next.session.starts_at) : 'Nothing scheduled'}</span>
        </div>
        <div className="stat"><small>Next 7 days</small><b>{dash.next_7_days}</b><span>sessions</span></div>
        <div className="stat"><small>Next 30 days</small><b>{dash.next_30_days}</b><span>sessions</span></div>
        <div className="stat"><small>Published events</small><b>{dash.published_events}</b><span>{dash.draft_events} drafts</span></div>
        <div className="stat"><small>Stories</small><b>{dash.published_stories}</b><span>{dash.draft_stories} drafts</span></div>
        <div className="stat"><small>Videos</small><b>{dash.video_count}</b><span>{dash.videos_without_id} without a YouTube link</span></div>
        <div className={`stat ${dash.sessions_without_tickets ? 'alert' : ''}`}><small>Ticket links missing</small><b>{dash.sessions_without_tickets}</b><span>upcoming sessions</span></div>
        <div className={`stat ${dash.unresolved_messages ? 'alert' : ''}`}><small>Messages</small><b>{dash.unresolved_messages}</b><span>unresolved</span></div>
      </div>
      <div className="dash-grid">
        <div>
          <RingSignature sessions={dash.upcoming_sessions} now={dash.now} />
          <section className="panel" style={{ marginTop: 20 }}>
            <div className="panel-head"><b>Upcoming sessions</b><Link href="/admin/calendar">Calendar</Link></div>
            <div className="panel-body">
              {dash.upcoming_sessions.length === 0 ? <p className="meta">No upcoming sessions.</p> : (
                <ul className="list-plain">
                  {dash.upcoming_sessions.map((p) => (
                    <li key={p.session.id}>
                      <span className="when">{fmtDateTime(p.session.starts_at)}</span>
                      <Link className="what" href={`/admin/events/${p.event.id}`}>{titleOf(p.event)}</Link>
                      <span className={`status status-${p.session.status}`}>{p.session.status.replace('_', ' ')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
        <div>
          <section className="panel">
            <div className="panel-head"><b>Recent edits</b></div>
            <div className="panel-body">
              {dash.recent_edits.length === 0 ? <p className="meta">No edits yet.</p> : (
                <ul className="list-plain">
                  {dash.recent_edits.map((a) => (
                    <li key={a.id} style={{ gridTemplateColumns: '90px 1fr' }}>
                      <span className="when">{fmtDateTime(a.created_at)}</span>
                      <span style={{ fontSize: 12 }}><b style={{ fontWeight: 500 }}>{a.action}</b> {a.resource} <span className="muted" style={{ color: 'var(--muted)' }}>{a.summary}</span><br /><small style={{ color: 'var(--dim)' }}>{a.actor_email}</small></span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
          <section className="panel">
            <div className="panel-head"><b>Recent media</b><Link href="/admin/media">Library</Link></div>
            <div className="panel-body">
              <div className="media-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {dash.recent_media.map((a) => (
                  <Link key={a.id} className="media-tile" href={`/admin/media?select=${a.id}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <div className="art"><img src={a.url} alt="" loading="lazy" /></div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export function ApiMissing() {
  return (
    <div className="empty">
      <p>The API is not connected.</p>
      <small>Set API_URL for this deployment. Public pages run in demo mode until the database is connected.</small>
    </div>
  );
}
export function ApiDown({ error }: { error: unknown }) {
  const message = error instanceof AdminApiError ? `${error.status} · ${error.message}` : error instanceof Error ? error.message : 'Unknown error';
  return (
    <div className="empty">
      <p>Backstage could not reach the API.</p>
      <small>{message}</small>
    </div>
  );
}
