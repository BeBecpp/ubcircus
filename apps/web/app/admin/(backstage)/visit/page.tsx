import VenueEditor from '@/components/admin/VenueEditor';
import { load } from '@/components/admin/Guarded';
import type { components } from '@/lib/api/schema';

export default async function VisitPage() {
  const { data, error } = await load<components['schemas']['VenueOut'][]>('venues');
  if (error) return error;
  return <VenueEditor initial={data![0] ?? null} />;
}
