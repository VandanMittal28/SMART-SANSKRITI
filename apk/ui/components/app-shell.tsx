"use client"

import { BottomNav } from '@/components/mobile/bottom-nav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mobile-shell text-[#F5E6D3]">
      <div className="mobile-scroll app-safe-padding">
        <main className="mx-auto w-full max-w-[420px] min-h-[100dvh]">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
