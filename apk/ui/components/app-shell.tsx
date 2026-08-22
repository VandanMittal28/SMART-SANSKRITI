"use client"

import { BottomNav } from '@/components/mobile/bottom-nav'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const focused = pathname.startsWith('/explore') || pathname.startsWith('/hunt')

  return (
    <div className="mobile-shell text-[#F5E6D3]">
      <div className={cn('mobile-scroll', focused ? 'pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]' : 'app-safe-padding')}>
        <main className="mx-auto w-full max-w-[420px] min-h-[100dvh]">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
