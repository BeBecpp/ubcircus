import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const production = process.env.CONTENT_MODE === 'database';
  return {
    rules: production ? [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api'] }] : [{ userAgent: '*', disallow: '/' }],
    sitemap: `${base}/sitemap.xml`,
  };
}
