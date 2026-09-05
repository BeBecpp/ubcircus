import { notFound } from 'next/navigation';
import EventEditor from '@/components/admin/EventEditor';
import { load } from '@/components/admin/Guarded';
import type { components } from '@/lib/api/schema';

type S = components['schemas'];

export default async function EventEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'new';
  const [event, categories, venues, videos] = await Promise.all([
    isNew ? Promise.resolve({ data: null, error: null }) : load<S['EventOut']>(`events/${id}`),
    load<S['CategoryOut'][]>('categories?kind=event'),
    load<S['VenueOut'][]>('venues'),
    load<S['VideoOut'][]>('videos'),
  ]);
  if (!isNew && event.error) {
    if (String(event.error).includes('404')) notFound();
    return event.error;
  }
  if (categories.error) return categories.error;
  return <EventEditor initial={event.data} categories={categories.data ?? []} venues={venues.data ?? []} videos={videos.data ?? []} />;
}
