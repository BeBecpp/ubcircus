import Link from 'next/link';
import { load } from '@/components/admin/Guarded';
import { fmtDate, titleOf } from '@/lib/admin/api';
import type { components } from '@/lib/api/schema';

export default async function StoriesPage() {
  const { data, error } = await load<components['schemas']['ArticleOut'][]>('articles');
  return (
    <>
      <div className="bs-head">
        <div><p className="eyebrow">Editorial</p><h1>Stories</h1><p>Editorial pieces from behind the curtain. Drafts stay private.</p></div>
        <Link className="btn btn-sm btn-ivory" href="/admin/stories/new">New story</Link>
      </div>
      {error ?? (
        <section className="panel">
          <table className="table">
            <thead><tr><th></th><th>Title</th><th>Status</th><th>Category</th><th>Published</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {data!.map((a) => (
                <tr key={a.id}>
                  <td>{a.lead_image ? /* eslint-disable-next-line @next/next/no-img-element */ <img className="thumb wide" src={a.lead_image.url} alt="" /> : <span className="thumb wide" />}</td>
                  <td className="title"><Link href={`/admin/stories/${a.id}`}>{titleOf(a)}</Link><br /><span className="muted">/{a.slug}</span></td>
                  <td><span className={`status status-${a.status}`}>{a.status}</span></td>
                  <td className="muted">{a.category?.labels.en ?? '—'}</td>
                  <td className="muted">{fmtDate(a.published_at)}</td>
                  <td className="muted">{fmtDate(a.updated_at)}</td>
                  <td className="actions"><Link className="btn btn-sm" href={`/admin/stories/${a.id}`}>Edit</Link></td>
                </tr>
              ))}
              {data!.length === 0 && <tr><td colSpan={7} className="muted">No stories yet.</td></tr>}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
