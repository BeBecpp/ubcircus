import CategoriesPanel from '@/components/admin/CategoriesPanel';
import { load } from '@/components/admin/Guarded';
import type { components } from '@/lib/api/schema';

type CategoryOut = components['schemas']['CategoryOut'];

export default async function CategoriesPage() {
  const [events, articles] = await Promise.all([load<CategoryOut[]>('categories?kind=event'), load<CategoryOut[]>('categories?kind=article')]);
  if (events.error) return events.error;
  return (
    <>
      <div className="bs-head">
        <div>
          <p className="eyebrow">Programme · Categories</p>
          <h1>Categories</h1>
          <p>Labels are translated per locale. Slugs are used in filters and URLs.</p>
        </div>
      </div>
      <CategoriesPanel kind="event" initial={events.data!} />
      <div style={{ height: 24 }} />
      <CategoriesPanel kind="article" initial={articles.data ?? []} />
    </>
  );
}
