import { notFound } from 'next/navigation';
import GalleryEditor from '@/components/admin/GalleryEditor';
import { load } from '@/components/admin/Guarded';
import type { components } from '@/lib/api/schema';

export default async function GalleryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === 'new') return <GalleryEditor initial={null} />;
  const { data, error } = await load<components['schemas']['GalleryOut'][]>('galleries');
  if (error) return error;
  const gallery = data!.find((g) => g.id === id);
  if (!gallery) notFound();
  return <GalleryEditor initial={gallery} />;
}
