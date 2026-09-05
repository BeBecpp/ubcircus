import Link from 'next/link';
import { load } from '@/components/admin/Guarded';
import { fmtDate, titleOf } from '@/lib/admin/api';
import type { components } from '@/lib/api/schema';

export default async function PagesPage() {
  const { data, error } = await load<components['schemas']['PageOut'][]>('pages');
  return (
    <>
      <div className="bs-head">
        <div><p className="eyebrow">Editorial</p><h1>Pages</h1><p>Institutional pages: about, visit, contact and any additional page.</p></div>
        <Link className="btn btn-sm btn-ivory" href="/admin/pages/new">New page</Link>
      </div>
      {error ?? (
        <section className="panel">
          <table className="table">
            <thead><tr><th>Title</th><th>Slug</th><th>Status</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {data!.map((p) => (
                <tr key={p.id}>
                  <td className="title"><Link href={`/admin/pages/${p.id}`}>{titleOf(p)}</Link></td>
                  <td className="muted">/{p.slug}</td>
                  <td><span className={`status status-${p.status}`}>{p.status}</span></td>
                  <td className="muted">{fmtDate(p.updated_at)}</td>
                  <td className="actions"><Link className="btn btn-sm" href={`/admin/pages/${p.id}`}>Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
