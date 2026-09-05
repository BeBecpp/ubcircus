import VideosPanel from '@/components/admin/VideosPanel';
import { load } from '@/components/admin/Guarded';
import type { components } from '@/lib/api/schema';

export default async function VideosPage() {
  const { data, error } = await load<components['schemas']['VideoOut'][]>('videos');
  if (error) return error;
  return (
    <>
      <div className="bs-head">
        <div><p className="eyebrow">Media</p><h1>Videos</h1><p>Poster-first YouTube films. The public player only loads after a visitor presses play.</p></div>
      </div>
      <VideosPanel initial={data!} />
    </>
  );
}
