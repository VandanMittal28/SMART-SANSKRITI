'use client'
import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle } from 'lucide-react'

export function AppWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const showChatButton = !['/chat', '/login', '/auth'].includes(pathname)

  return (
    <>
      {children}
      {showChatButton && (
        <Link
          href="/chat"
          className="fixed bottom-[calc(124px+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,#20193f,#0f1226)] text-[#F7D88C] shadow-[0_16px_36px_rgba(0,0,0,0.35)] transition-transform active:scale-95"
          aria-label="Open SANSKRITI BOT"
        >
          <MessageCircle className="h-5 w-5" />
        </Link>
      )}
    </>
  )
}
