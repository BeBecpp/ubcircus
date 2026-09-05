import MediaLibrary from '@/components/admin/MediaLibrary';
import { load } from '@/components/admin/Guarded';
import type { components } from '@/lib/api/schema';

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ select?: string }> }) {
  const { select } = await searchParams;
  const { data, error } = await load<components['schemas']['MediaAssetOut'][]>('media?limit=500');
  if (error) return error;
  let storageReady = false;
  try {
    const apiBase = (process.env.API_URL ?? '').replace(/\/$/, '');
    const health = await fetch(`${apiBase}/health`, { cache: 'no-store' }).then((r) => r.json());
    storageReady = health.storage === 'ok';
  } catch {
    storageReady = false;
  }
  return (
    <>
      <div className="bs-head">
        <div><p className="eyebrow">Media</p><h1>Library</h1><p>Supabase Storage. Uploads go straight from the browser to the bucket with a short-lived signed ticket.</p></div>
      </div>
      <MediaLibrary initial={data!} storageReady={storageReady} selectId={select} />
    </>
  );
}
