import type { Locale } from '@/lib/i18n';
import { txs } from './select';
import type { MediaAsset } from './types';

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Resolve `<figure data-media="ID">…</figure>` placeholders in editorial HTML into images.
 * The API sanitizes rich text on write; sample content is authored in-repo.
 */
export function renderBody(html: string, media: Map<string, MediaAsset>, locale: Locale): string {
  return html.replace(/<figure\s+data-media="([^"]+)"[^>]*>([\s\S]*?)<\/figure>/g, (_m, id: string, inner: string) => {
    const asset = media.get(id);
    if (!asset) return '';
    return `<figure><img src="${escapeAttr(asset.url)}" alt="${escapeAttr(txs(asset.alt, locale))}" width="${asset.width}" height="${asset.height}" loading="lazy" decoding="async" />${inner}</figure>`;
  });
}
