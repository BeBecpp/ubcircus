import { notFound } from 'next/navigation';
import PageEditor from '@/components/admin/PageEditor';
import { load } from '@/components/admin/Guarded';
import type { components } from '@/lib/api/schema';

export default async function PageEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === 'new') return <PageEditor initial={null} />;
  const { data, error } = await load<components['schemas']['PageOut'][]>('pages');
  if (error) return error;
  const page = data!.find((p) => p.id === id);
  if (!page) notFound();
  return <PageEditor initial={page} />;
}
