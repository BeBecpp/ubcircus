import Image from 'next/image';
import type { Locale } from '@/lib/i18n';
import { focalStyle, txs, type MediaAsset } from '@/lib/content';

type Props = {
  asset: MediaAsset | null | undefined;
  locale: Locale;
  ratio?: '3x4' | '16x9' | '4x3' | '1x1' | '21x9' | 'none';
  sizes?: string;
  priority?: boolean;
  className?: string;
  alt?: string;
};

/** CMS artwork with focal-point cropping. Renders a designed empty frame when no asset exists. */
export default function Artwork({ asset, locale, ratio = '16x9', sizes = '100vw', priority, className = '', alt }: Props) {
  const ratioClass = ratio === 'none' ? '' : `art-${ratio}`;
  if (!asset) return <div className={`art ${ratioClass} ${className}`} aria-hidden="true" />;
  return (
    <div className={`art ${ratioClass} ${className}`}>
      <Image src={asset.url} alt={alt ?? txs(asset.alt, locale)} fill sizes={sizes} priority={priority} style={focalStyle(asset)} />
    </div>
  );
}
