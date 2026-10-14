"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { IconCamera, IconCompass, IconFlag, IconHome } from "@/components/icons";
import { useVisitor } from "@/components/visitor/use-visitor";
import { YatrikAvatar } from "@/components/yatrik/yatrik-avatar";
import { YatrikPanel } from "@/components/yatrik/yatrik-panel";
import { useYatrik } from "@/components/yatrik/yatrik-provider";

const NAV = [
  { href: "/home", label: "Home", Icon: IconHome },
  { href: "/monuments", label: "Monuments", short: "Explore", Icon: IconCompass },
  { href: "/recognize", label: "Recognise", short: "Recognise", Icon: IconCamera },
  { href: "/report", label: "Report an issue", short: "Report", Icon: IconFlag },
] as const;

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Phones: a slim top bar and a bottom navigation bar within thumb reach, with
// Yatrik as its last item (opens a full-screen panel). Desktop: navigation in
// the header and Yatrik on a tab along the right edge, in space reserved so it
// never covers content; the open panel pushes the page aside.
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { visitor } = useVisitor();
  const yatrik = useYatrik();

  return (
    <div className="app" data-yatrik={yatrik.isOpen ? "open" : "closed"}>
      <header className="app-header">
        <div className="app-header__bar">
          <Link href="/home" className="app-header__brand">
            <span className="seal seal--sm">
              <Logo variant="mark" size={28} idPrefix="header" />
            </span>
            <span className="app-header__wordmark">Sanskriti</span>
          </Link>
          <nav className="app-header__nav" aria-label="Main">
            {NAV.map(({ href, label }) => (
              <Link key={href} href={href} className="app-header__link" aria-current={isCurrent(pathname, href) ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
          {visitor && (
            <p className="app-header__visitor">
              <span className="visually-hidden">Visiting as </span>
              {visitor.displayName}
            </p>
          )}
        </div>
      </header>

      <main id="main" className="app-main" tabIndex={-1}>
        {children}
      </main>

      <nav className="bottom-nav" aria-label="Main">
        {NAV.map(({ href, label, Icon, ...rest }) => (
          <Link key={href} href={href} className="bottom-nav__item" aria-current={isCurrent(pathname, href) ? "page" : undefined}>
            <Icon size={22} />
            <span>{"short" in rest ? rest.short : label}</span>
          </Link>
        ))}
        <button
          type="button"
          className="bottom-nav__item bottom-nav__yatrik"
          aria-haspopup="dialog"
          aria-expanded={yatrik.isOpen}
          onClick={(event) => yatrik.open({ opener: event.currentTarget })}
        >
          <YatrikAvatar size={30} />
          <span>Yatrik</span>
        </button>
      </nav>

      {!yatrik.isOpen && (
        <button type="button" className="yatrik-dock" aria-haspopup="dialog" aria-expanded={false} onClick={(event) => yatrik.open({ opener: event.currentTarget })}>
          <YatrikAvatar size={56} />
          <span>Ask Yatrik</span>
        </button>
      )}

      {yatrik.isOpen && <YatrikPanel />}
    </div>
  );
}
