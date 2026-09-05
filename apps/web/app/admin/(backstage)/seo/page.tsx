import SettingsEditor from '@/components/admin/SettingsEditor';
import { load } from '@/components/admin/Guarded';
import type { components } from '@/lib/api/schema';

export default async function SeoPage() {
  const [settings, media, me] = await Promise.all([load<Record<string, unknown>>('settings'), load<components['schemas']['MediaAssetOut'][]>('media?limit=500'), load<components['schemas']['ProfileOut']>('me')]);
  if (settings.error) return settings.error;
  return <SettingsEditor initial={settings.data!} media={media.data ?? []} mode="seo" isAdmin={me.data?.role === 'admin'} />;
}
