import Link from 'next/link';
import { load } from '@/components/admin/Guarded';
import { titleOf } from '@/lib/admin/api';
import type { components } from '@/lib/api/schema';

export default async function GalleriesPage() {
  const { data, error } = await load<components['schemas']['GalleryOut'][]>('galleries');
  return (
    <>
      <div className="bs-head">
        <div><p className="eyebrow">Media</p><h1>Galleries</h1><p>Curated sets that feed the archive page and the homepage filmstrip.</p></div>
        <Link className="btn btn-sm btn-ivory" href="/admin/galleries/new">New gallery</Link>
      </div>
      {error ?? (
        <section className="panel">
          <table className="table">
            <thead><tr><th></th><th>Title</th><th>Category</th><th>Items</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {data!.map((g) => (
                <tr key={g.id}>
                  <td>{g.items[0] ? /* eslint-disable-next-line @next/next/no-img-element */ <img className="thumb" src={g.items[0].media.url} alt="" /> : <span className="thumb" />}</td>
                  <td className="title"><Link href={`/admin/galleries/${g.id}`}>{titleOf(g)}</Link><br /><span className="muted">/{g.slug}</span></td>
                  <td className="muted">{g.category}</td>
                  <td className="num">{g.items.length}</td>
                  <td><span className={`status status-${g.status}`}>{g.status}</span></td>
                  <td className="actions"><Link className="btn btn-sm" href={`/admin/galleries/${g.id}`}>Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
