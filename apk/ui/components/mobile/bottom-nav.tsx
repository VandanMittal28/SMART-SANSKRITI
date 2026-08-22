"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Route, Ticket, Sparkles, UserRound } from 'lucide-react'
import { ScanButton } from './scan-button'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/recognition', label: 'Scan', icon: Sparkles, special: true },
  { href: '/itinerary', label: 'Itinerary', icon: Route },
  { href: '/profile', label: 'Profile', icon: UserRound },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[calc(env(safe-area-inset-bottom)+10px)]">
      <nav className="pointer-events-auto mx-3 flex w-full max-w-[420px] items-end justify-between rounded-[28px] border border-white/10 bg-[rgba(7,10,22,0.72)] px-3 py-2 shadow-[0_-16px_50px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
        {tabs.map((tab) => {
          if (tab.special) {
            return <ScanButton key={tab.href} />
          }

          const active = pathname === tab.href || pathname?.startsWith(`${tab.href}/`)
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex min-w-[56px] flex-1 flex-col items-center gap-1 rounded-[18px] px-2 py-2 text-[10px] font-semibold transition-all duration-200',
                active ? 'text-[#F7D88C]' : 'text-[#A89A7D]'
              )}
            >
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-200', active ? 'bg-[#C9A84C]/18 text-[#F7D88C] shadow-[0_10px_24px_rgba(201,168,76,0.18)]' : 'bg-transparent text-[#D1C0A1]')}>
                <Icon className="h-4 w-4" />
              </span>
              <span>{tab.label}</span>
              <span className={cn('h-1 w-1 rounded-full bg-[#C9A84C] transition-opacity', active ? 'opacity-100' : 'opacity-0')} />
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
