"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Luggage, ScanLine, UserRound } from 'lucide-react'
import { ScanButton } from './scan-button'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/recognition', label: 'Scan', icon: ScanLine, special: true },
  { href: '/tickets', label: 'Trips', icon: Luggage },
  { href: '/profile', label: 'Profile', icon: UserRound },
]

export function BottomNav() {
  const pathname = usePathname()
  if (pathname.startsWith('/hunt') || pathname.startsWith('/explore')) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center">
      <nav className="pointer-events-auto flex min-h-[72px] w-full max-w-[420px] items-end justify-between border-t border-[#D6A84B]/12 bg-[#0B1122]/98 px-3 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.22)]">
        {tabs.map((tab) => {
          if (tab.special) {
            return <ScanButton key={tab.href} />
          }

          const active = pathname === tab.href || pathname?.startsWith(`${tab.href}/`) || (tab.href === '/tickets' && pathname.startsWith('/itinerary'))
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex min-w-[54px] flex-1 flex-col items-center gap-1 px-2 py-1 text-[10px] font-semibold transition-colors duration-200',
                active ? 'text-[#F3DFC0]' : 'text-[#8891A6]'
              )}
            >
              <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-200', active ? 'bg-[#D6A84B]/14 text-[#D6A84B]' : 'text-[#8891A6]')}>
                <Icon className="h-4 w-4" />
              </span>
              <span>{tab.label}</span>
              <span className={cn('h-0.5 w-4 rounded-full bg-[#D6A84B] transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
