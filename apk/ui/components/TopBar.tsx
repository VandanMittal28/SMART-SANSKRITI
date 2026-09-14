'use client'

import Link from 'next/link'
import Image from 'next/image'
import { UserRound } from 'lucide-react'
import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import { useLang } from '@/lib/languageContext'
import { LanguageSelect } from '@/components/language-select'
import { ThemeToggle } from '@/components/theme-toggle'

export function TopBar() {
  const { profile } = useAuth()
  const { lang } = useLang()
  const pathname = usePathname()
  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  const initials = useMemo(() => {
    const source = profile?.full_name || profile?.username || 'SA'
    return source
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }, [profile])

  if (
    normalizedPathname === '/login' ||
    normalizedPathname === '/auth' ||
    normalizedPathname.startsWith('/explore') ||
    normalizedPathname.startsWith('/hunt')
  ) return null

  return (
    <header className="fixed top-0 z-50 w-full border-b border-[#D6A84B]/10 bg-[#080D1D]/95 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
      <div className="mx-auto flex h-16 w-full max-w-[420px] items-center justify-between px-5">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-[#D6A84B]/20 bg-[#11182B]">
            <Image src="/sanskriti-logo.svg" alt="Sanskriti AI logo" width={36} height={36} className="h-full w-full object-cover" priority />
          </div>
          <div className="min-w-0">
            <p className="truncate font-heritage text-sm font-bold tracking-tight text-[#F6F1E8]">{lang === 'hi' ? 'संस्कृति AI' : 'Sanskriti AI'}</p>
            <p className="text-[9px] uppercase tracking-[0.16em] text-[#8891A6]">{lang === 'hi' ? 'जीवित विरासत' : 'Living Heritage'}</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSelect />
          <ThemeToggle />

          <Link
            href="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#11182B] text-[#F6F1E8]"
            aria-label="Open profile"
          >
            {profile?.full_name ? (
              <span className="text-[11px] font-bold tracking-tight text-[#F7D88C]">{initials}</span>
            ) : (
              <UserRound className="h-4 w-4 text-[#D9C7AA]" />
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
