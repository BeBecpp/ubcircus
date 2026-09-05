'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { copy, href, locales, localeNames, type Locale } from '@/lib/i18n';
import { txs, type NavigationItem } from '@/lib/content';

type Props = { locale: Locale; items: NavigationItem[]; siteName: string; wordmarkSub: string };

export default function MainNavigation({ locale, items, siteName, wordmarkSub }: Props) {
  const t = copy[locale];
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const change = () => setScrolled(window.scrollY > 24);
    change();
    window.addEventListener('scroll', change, { passive: true });
    return () => window.removeEventListener('scroll', change);
  }, []);

  useEffect(() => {
    dialog.current?.close();
    document.body.style.overflow = '';
    document.documentElement.lang = locale;
  }, [pathname, locale]);

  function open() {
    dialog.current?.showModal();
    document.body.style.overflow = 'hidden';
  }
  function close() {
    dialog.current?.close();
    document.body.style.overflow = '';
  }
  const switchLocale = (l: Locale) => pathname.replace(/^\/(mn|en|tr)(?=\/|$)/, `/${l}`) || `/${l}`;
  const isCurrent = (path: string) => pathname === href(locale, path) || pathname.startsWith(`${href(locale, path)}/`);

  return (
    <>
      <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <Link className="wordmark" href={href(locale)} aria-label={t.home}>
          {siteName}
          <span>{wordmarkSub}</span>
        </Link>
        <nav className="nav-links" aria-label="Main">
          {items.map((item) => (
            <Link key={item.id} href={href(locale, item.href)} aria-current={isCurrent(item.href) ? 'page' : undefined}>
              {txs(item.label, locale)}
            </Link>
          ))}
        </nav>
        <div className="nav-end">
          <div className="locales" aria-label={t.language}>
            {locales.map((l) => (
              <Link key={l} lang={l} hrefLang={l} aria-label={localeNames[l]} aria-current={l === locale ? 'true' : undefined} href={switchLocale(l)}>
                {l.toUpperCase()}
              </Link>
            ))}
          </div>
          <Link className="ticket-link" href={href(locale, '/events')}>
            {t.tickets}
            <ArrowUpRight strokeWidth={1.5} aria-hidden="true" />
          </Link>
          <button className="menu-toggle" onClick={open} aria-label={t.menu} aria-haspopup="dialog">
            <span />
            <span />
          </button>
        </div>
      </header>

      <dialog className="menu-dialog" ref={dialog} onClose={close} aria-label={t.menu}>
        <div className="menu-inner">
          <div className="menu-top">
            <span className="wordmark">
              {siteName}
              <span>{wordmarkSub}</span>
            </span>
            <button onClick={close}>
              {t.close}
              <X strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
          <nav className="menu-nav" aria-label={t.menu}>
            {items.map((item, i) => (
              <Link key={item.id} onClick={close} href={href(locale, item.href)}>
                <sup>0{i + 1}</sup>
                {txs(item.label, locale)}
                <ArrowUpRight strokeWidth={1.2} aria-hidden="true" />
              </Link>
            ))}
            <Link onClick={close} href={href(locale, '/contact')}>
              <sup>0{items.length + 1}</sup>
              {t.contact}
              <ArrowUpRight strokeWidth={1.2} aria-hidden="true" />
            </Link>
          </nav>
          <div className="menu-foot">
            <div className="menu-languages">
              {locales.map((l) => (
                <Link onClick={close} key={l} lang={l} aria-current={l === locale ? 'true' : undefined} href={switchLocale(l)}>
                  {l.toUpperCase()}
                </Link>
              ))}
            </div>
            <p className="eyebrow">{t.ringAfterDark}<br />{t.tagline}</p>
          </div>
        </div>
      </dialog>
    </>
  );
}
