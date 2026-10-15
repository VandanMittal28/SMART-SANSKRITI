"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Luggage, ScanLine, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/recognition', label: 'Scan', icon: ScanLine, special: true },
  { href: '/tickets', label: 'Trips', icon: Luggage },
  { href: '/profile', label: 'Profile', icon: UserRound },
]

/**
 * A floating pill rather than a full-width bar: it lets the content scroll
 * under it and keeps the screen feeling lighter, which is the whole point of
 * the light canvas.
 */
export function BottomNav() {
  const pathname = usePathname()
  if (pathname.startsWith('/hunt') || pathname.startsWith('/explore')) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[calc(env(safe-area-inset-bottom)+14px)]">
      <nav
        aria-label="Primary"
        className="pointer-events-auto flex w-[min(360px,calc(100%-32px))] items-center justify-between gap-1 rounded-[26px] bg-[var(--card)] px-2.5 py-2.5 shadow-[var(--shadow-raised)]"
      >
        {tabs.map((tab) => {
          const active =
            pathname === tab.href ||
            pathname?.startsWith(`${tab.href}/`) ||
            (tab.href === '/tickets' && (pathname.startsWith('/itinerary') || pathname.startsWith('/marketplace')))
          const Icon = tab.icon

          if (tab.special) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label="Scan a monument"
                className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[20px] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-amber)] transition-transform active:scale-95"
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={2.2} />
              </Link>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[18px] px-1 py-1.5 transition-colors',
                active ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]',
              )}
            >
              <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 1.9} />
              <span className={cn('text-[10px] leading-none', active ? 'font-bold' : 'font-medium')}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
