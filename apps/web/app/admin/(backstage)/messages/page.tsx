import MessagesPanel from '@/components/admin/MessagesPanel';
import { load } from '@/components/admin/Guarded';
import type { components } from '@/lib/api/schema';

export default async function MessagesPage() {
  const { data, error } = await load<components['schemas']['ContactMessageOut'][]>('messages');
  if (error) return error;
  return <MessagesPanel initial={data!} />;
}
