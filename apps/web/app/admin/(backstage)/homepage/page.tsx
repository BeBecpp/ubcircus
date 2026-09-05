import HomepageCurator from '@/components/admin/HomepageCurator';
import { load } from '@/components/admin/Guarded';
import type { components } from '@/lib/api/schema';

type S = components['schemas'];

export default async function HomepagePage() {
  const [sections, events, articles, videos, media] = await Promise.all([load<S['HomepageSectionOut'][]>('homepage'), load<S['EventOut'][]>('events'), load<S['ArticleOut'][]>('articles'), load<S['VideoOut'][]>('videos'), load<S['MediaAssetOut'][]>('media?limit=500')]);
  if (sections.error) return sections.error;
  return <HomepageCurator initial={sections.data!} events={events.data ?? []} articles={articles.data ?? []} videos={videos.data ?? []} media={media.data ?? []} />;
}
