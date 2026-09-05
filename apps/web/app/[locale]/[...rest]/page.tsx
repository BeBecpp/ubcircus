import { notFound } from 'next/navigation';

/** Any unmatched path under a locale renders the locale-aware not-found page (with navigation and footer). */
export default function CatchAll() {
  notFound();
}
