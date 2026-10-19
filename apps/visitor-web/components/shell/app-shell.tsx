"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { IconCompass, IconFlag, IconHome } from "@/components/icons";
import { useVisitor } from "@/components/visitor/use-visitor";
import { YatrikFloating } from "@/components/yatrik/yatrik-floating";
import { YatrikPanel } from "@/components/yatrik/yatrik-panel";
import { useYatrik } from "@/components/yatrik/yatrik-provider";

// Labels follow the original app's navigation (Home / Explore). Monument
// Recognition has no tab of its own: it is opened from Explore (and the home
// screen's "Scan a monument" card), so Explore stays current while it is open.
const NAV = [
  { href: "/home", label: "Home", short: "Home", Icon: IconHome },
  { href: "/monuments", label: "Explore", short: "Explore", Icon: IconCompass, also: ["/recognize"] },
  { href: "/report", label: "Report an issue", short: "Report", Icon: IconFlag },
] as const;

function isCurrent(pathname: string, item: (typeof NAV)[number]) {
  const paths: readonly string[] = "also" in item ? [item.href, ...item.also] : [item.href];
  return paths.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

// Phones: a slim top bar and a bottom navigation bar within thumb reach.
// Desktop: navigation in the header. Yatrik is a floating character on both
// (see YatrikFloating); its panel is full screen on phones and pushes the page
// aside on desktop.
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
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="app-header__link" aria-current={isCurrent(pathname, item) ? "page" : undefined}>
                {item.label}
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
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="bottom-nav__item" aria-current={isCurrent(pathname, item) ? "page" : undefined}>
            <span className="bottom-nav__icon">
              <item.Icon size={22} />
            </span>
            <span>{item.short}</span>
          </Link>
        ))}
      </nav>

      <YatrikFloating />
      {yatrik.isOpen && <YatrikPanel />}
    </div>
  );
}
