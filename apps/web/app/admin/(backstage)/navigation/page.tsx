import NavigationEditor from '@/components/admin/NavigationEditor';
import { load } from '@/components/admin/Guarded';
import type { components } from '@/lib/api/schema';

export default async function NavigationPage() {
  const { data, error } = await load<components['schemas']['NavigationItemOut'][]>('navigation');
  if (error) return error;
  return <NavigationEditor initial={data!} />;
}
