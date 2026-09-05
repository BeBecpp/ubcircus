import type { components } from '@/lib/api/schema';

export type S = components['schemas'];
export type EventIn = S['EventIn'];
export type EventOut = S['EventOut'];
export type SessionIn = S['SessionIn'];
export type ArticleIn = S['ArticleIn'];
export type ArticleOut = S['ArticleOut'];
export type VideoIn = S['VideoIn'];
export type VideoOut = S['VideoOut'];
export type GalleryIn = S['GalleryIn'];
export type GalleryOut = S['GalleryOut'];
export type PageIn = S['PageIn'];
export type PageOut = S['PageOut'];
export type CategoryIn = S['CategoryIn'];
export type CategoryOut = S['CategoryOut'];
export type VenueIn = S['VenueIn'];
export type VenueOut = S['VenueOut'];
export type MediaAssetOut = S['MediaAssetOut'];
export type MediaMetaIn = S['MediaMetaIn'];
export type HomepageSectionIn = S['HomepageSectionIn'];
export type HomepageSectionOut = S['HomepageSectionOut'];
export type NavigationItemIn = S['NavigationItemIn'];
export type NavigationItemOut = S['NavigationItemOut'];
export type ProfileOut = S['ProfileOut'];
export type DashboardOut = S['DashboardOut'];
export type AuditOut = S['AuditOut'];
export type ContactMessageOut = S['ContactMessageOut'];
export type UploadTicketOut = S['UploadTicketOut'];

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}

/** Client-side call through the same-origin proxy (/api/admin/*). */
export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/admin/${path.replace(/^\//, '')}`, {
    ...init,
    headers: { accept: 'application/json', ...(init.json !== undefined ? { 'content-type': 'application/json' } : {}), ...(init.headers ?? {}) },
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const mutation = (init.method ?? 'GET').toUpperCase() !== 'GET';
  if (res.ok && mutation) void fetch('/api/admin-revalidate', { method: 'POST' }).catch(() => undefined);
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.detail;
    const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((d: { msg?: string; loc?: string[] }) => `${(d.loc ?? []).slice(1).join('.')}: ${d.msg}`).join('; ') : detail?.message ?? res.statusText;
    throw new ApiError(res.status, message, detail);
  }
  return data as T;
}

/** Direct-to-storage upload using a signed ticket from the API. */
export async function uploadFile(file: File, meta: Partial<S['FinalizeUploadIn']> = {}, replaceId?: string, onProgress?: (pct: number) => void): Promise<MediaAssetOut> {
  const ticket = await api<UploadTicketOut>('media/upload-url', { method: 'POST', json: { file_name: file.name, mime_type: file.type, size: file.size, replace_id: replaceId ?? null } });
  const dims = await imageDimensions(file);
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(ticket.method || 'PUT', ticket.upload_url);
    xhr.setRequestHeader('content-type', file.type);
    for (const [k, v] of Object.entries(ticket.headers ?? {})) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => onProgress?.(e.lengthComputable ? Math.round((e.loaded / e.total) * 100) : 0);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new ApiError(xhr.status, `Storage upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new ApiError(0, 'Storage upload failed'));
    xhr.send(file);
  });
  return api<MediaAssetOut>('media/finalize', { method: 'POST', json: { object_key: ticket.object_key, file_name: file.name, mime_type: file.type, size: file.size, width: dims?.width ?? 0, height: dims?.height ?? 0, replace_id: replaceId ?? null, alt: {}, category: 'photography', tags: [], ...meta } });
}

function imageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

export const LOCALES = ['mn', 'en', 'tr'] as const;
export type AdminLocale = (typeof LOCALES)[number];
export const STATUSES = ['draft', 'scheduled', 'published', 'cancelled', 'archived'] as const;

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ulaanbaatar', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}
export function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ulaanbaatar', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}
/** ISO instant → value for <input type="datetime-local"> in Asia/Ulaanbaatar. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ulaanbaatar', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(iso));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
}
/** datetime-local value (Ulaanbaatar wall time, UTC+8, no DST) → ISO instant. */
export function fromLocalInput(value: string) {
  return value ? `${value}:00+08:00` : '';
}
export function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160);
}
export function titleOf<T extends { translations: Record<string, { title?: string } | undefined> }>(item: T) {
  return item.translations.mn?.title || item.translations.en?.title || item.translations.tr?.title || '—';
}
