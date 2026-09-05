import type { Locale } from '@/lib/i18n';

/** Partial translation map. Missing locales fall back to Mongolian, then the first available. */
export type Tr<T = string> = Partial<Record<Locale, T>>;

export type MediaCategory = 'photography' | 'performances' | 'behind-the-scenes' | 'posters' | 'videos';
export type MediaAsset = {
  id: string;
  kind: 'image' | 'video';
  url: string;
  object_key: string | null;
  file_name: string;
  mime_type: string;
  size: number;
  width: number;
  height: number;
  alt: Tr;
  caption: Tr | null;
  credit: string;
  photographer: string;
  focal_x: number;
  focal_y: number;
  category: MediaCategory;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type Category = { id: string; slug: string; kind: 'event' | 'article'; labels: Tr; display_order: number };

export type Venue = {
  id: string;
  slug: string;
  name: Tr;
  address: Tr;
  directions: Tr;
  accessibility: Tr;
  hours: Tr;
  notes: Tr;
  map_url: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  email: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
};

export type TicketLink = { id: string; label: string; url: string | null; price: string | null; currency: string | null; note: string };
export type SessionStatus = 'scheduled' | 'sold_out' | 'cancelled';
export type Session = { id: string; starts_at: string; ends_at: string | null; status: SessionStatus; ticket: TicketLink | null };

export type PublishStatus = 'draft' | 'scheduled' | 'published' | 'cancelled' | 'archived';
export type EventTranslation = { title: string; subtitle: string; excerpt: string; description: string; audience: string; seo_title: string; seo_description: string };

export type VideoTranslation = { title: string; subtitle: string; description: string };
export type Video = {
  id: string;
  youtube_id: string | null;
  poster: MediaAsset | null;
  featured: boolean;
  display_order: number;
  status: PublishStatus;
  sample: boolean;
  translations: Tr<VideoTranslation>;
  created_at: string;
  updated_at: string;
};

export type Event = {
  id: string;
  slug: string;
  status: PublishStatus;
  category: Category | null;
  venue: Venue | null;
  duration_minutes: number | null;
  poster: MediaAsset | null;
  hero: MediaAsset | null;
  video: Video | null;
  gallery: MediaAsset[];
  sample: boolean;
  published_at: string | null;
  credits: Tr;
  translations: Tr<EventTranslation>;
  sessions: Session[];
  created_at: string;
  updated_at: string;
};

/** One scheduled performance joined with its production. */
export type Performance = { session: Session; event: Event };

export type ArticleTranslation = { title: string; subtitle: string; excerpt: string; body: string; seo_title: string; seo_description: string };
export type Article = {
  id: string;
  slug: string;
  status: PublishStatus;
  category: Category | null;
  lead_image: MediaAsset | null;
  published_at: string | null;
  sample: boolean;
  reading_minutes: number | null;
  translations: Tr<ArticleTranslation>;
  created_at: string;
  updated_at: string;
};

export type GalleryItem = { id: string; media: MediaAsset; display_order: number; caption: Tr | null };
export type Gallery = {
  id: string;
  slug: string;
  status: PublishStatus;
  category: MediaCategory;
  sample: boolean;
  translations: Tr<{ title: string; description: string }>;
  items: GalleryItem[];
  created_at: string;
  updated_at: string;
};

export type PageTranslation = { title: string; subtitle: string; body: string; seo_title: string; seo_description: string };
export type Page = { id: string; slug: string; status: PublishStatus; settings: Record<string, unknown>; translations: Tr<PageTranslation>; created_at: string; updated_at: string };

export type NavigationItem = { id: string; group: 'header' | 'footer'; href: string; label: Tr; display_order: number; parent_id: string | null; external: boolean };

export type SiteSettings = {
  site: { name: string; wordmark_sub: string; tagline: Tr; description: Tr; contact_email: string; phone: string; social: Record<string, string> };
  locales: { enabled: Locale[]; default: Locale };
  seo: { title_template: string; og_image_id: string | null; index: boolean };
  contact: { categories: string[] };
};

export type HomepageSectionKind = 'hero_orbit' | 'next_on_stage' | 'featured_performances' | 'whats_on' | 'featured_video' | 'in_motion' | 'stories' | 'about_feature' | 'plan_your_visit';
export type HomepageSectionItem = { id: string; resource: 'event' | 'article' | 'video' | 'media' | 'gallery'; resource_id: string; display_order: number };
export type HomepageSection = { id: string; kind: HomepageSectionKind; enabled: boolean; display_order: number; settings: Record<string, unknown>; items: HomepageSectionItem[] };

export type AboutFeature = { year_label: string; year_caption: Tr; title: Tr; body: Tr; image: MediaAsset | null; href: string };

export type Homepage = {
  sections: { kind: HomepageSectionKind; enabled: boolean }[];
  hero: { caption: Tr; events: Event[] };
  next_on_stage: Performance[];
  featured: Event[];
  whats_on: Event[];
  video: Video | null;
  in_motion: MediaAsset[];
  stories: Article[];
  about: AboutFeature | null;
  visit: Venue | null;
  categories: Category[];
};

export type ContactPayload = { name: string; email: string; category: string; message: string; locale: Locale; website?: string };

/** Normalized content document shared by the API seeder and the demo provider. */
export type ContentDocument = {
  version: number;
  generated_at: string;
  sample: boolean;
  media: MediaAsset[];
  event_categories: Category[];
  article_categories: Category[];
  venues: Venue[];
  events: (Omit<Event, 'category' | 'venue' | 'poster' | 'hero' | 'video' | 'gallery'> & { category_id: string | null; venue_id: string | null; poster_id: string | null; hero_id: string | null; video_id: string | null; gallery_ids: string[] })[];
  videos: (Omit<Video, 'poster'> & { poster_id: string | null })[];
  galleries: (Omit<Gallery, 'items'> & { items: { id: string; media_id: string; display_order: number; caption: Tr | null }[] })[];
  articles: (Omit<Article, 'category' | 'lead_image'> & { category_id: string | null; lead_image_id: string | null })[];
  pages: Page[];
  homepage_sections: HomepageSection[];
  navigation_items: NavigationItem[];
  site_settings: { key: string; value: unknown }[];
};

export type EventQuery = { range?: 'upcoming' | 'past' | 'all' | 'week' | 'month'; category?: string; month?: string; date?: string; limit?: number };

export interface ContentProvider {
  readonly mode: 'demo' | 'api';
  homepage(): Promise<Homepage>;
  events(query?: EventQuery): Promise<Event[]>;
  event(slug: string): Promise<Event | null>;
  calendar(month: string): Promise<Performance[]>;
  articles(limit?: number): Promise<Article[]>;
  article(slug: string): Promise<Article | null>;
  videos(): Promise<Video[]>;
  galleries(): Promise<Gallery[]>;
  media(): Promise<MediaAsset[]>;
  page(slug: string): Promise<Page | null>;
  venues(): Promise<Venue[]>;
  categories(kind?: 'event' | 'article'): Promise<Category[]>;
  navigation(): Promise<NavigationItem[]>;
  settings(): Promise<SiteSettings>;
  contact(payload: ContactPayload): Promise<{ ok: boolean; error?: string }>;
}
