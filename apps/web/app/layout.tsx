import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/noto-sans';
import '@fontsource-variable/noto-serif-display';
import './globals.css';
import '../styles/base.css';
import '../styles/site.css';
import '../styles/hero.css';
import '../styles/home.css';
import '../styles/pages.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'UB CIRCUS — Улаанбаатар цирк', template: '%s · UB CIRCUS' },
  description: 'Улаанбаатар цирк. Тоглолт, хөдөлгөөн, тайзны ертөнц.',
  robots: { index: process.env.CONTENT_MODE === 'database', follow: true },
  openGraph: { siteName: 'UB CIRCUS', type: 'website', images: ['/placeholders/stage-01.svg'] },
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { themeColor: '#070707', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <body>{children}</body>
    </html>
  );
}
