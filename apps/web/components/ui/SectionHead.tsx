import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = { kicker: string; title?: ReactNode; aside?: { href: string; label: string }; id?: string; children?: ReactNode };

export default function SectionHead({ kicker, title, aside, id, children }: Props) {
  return (
    <div className="section-head" id={id}>
      <div>
        <div className="kicker">
          <i aria-hidden="true" />
          {kicker}
        </div>
        {title && <h2 className="title">{title}</h2>}
        {children}
      </div>
      {aside && (
        <Link className="aside link-arrow" href={aside.href}>
          {aside.label}
          <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
