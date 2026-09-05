import { notFound } from 'next/navigation';
import StoryEditor from '@/components/admin/StoryEditor';
import { load } from '@/components/admin/Guarded';
import type { components } from '@/lib/api/schema';

type S = components['schemas'];

export default async function StoryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'new';
  const [article, categories] = await Promise.all([isNew ? Promise.resolve({ data: null, error: null }) : load<S['ArticleOut']>(`articles/${id}`), load<S['CategoryOut'][]>('categories?kind=article')]);
  if (!isNew && article.error) {
    if (String(article.error).includes('404')) notFound();
    return article.error;
  }
  return <StoryEditor initial={article.data} categories={categories.data ?? []} />;
}
