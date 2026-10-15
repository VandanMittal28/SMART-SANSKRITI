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
    normalizedPathname === '/report' ||
    normalizedPathname.startsWith('/explore') ||
    normalizedPathname.startsWith('/hunt')
  ) return null

  return (
    <header className="fixed top-0 z-50 w-full bg-[var(--background)]/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] w-full max-w-[420px] items-center justify-between px-[22px]">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Sanskriti AI home">
          {/* The mark carries its own ink tile, which would otherwise disappear
              against the dark canvas, so it keeps a hairline in both themes. */}
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[13px] ring-1 ring-[var(--border)] shadow-[var(--shadow-card)]">
            <Image src="/sanskriti-logo.png" alt="" width={40} height={40} className="h-full w-full object-cover" priority />
          </span>
          <span className="min-w-0 leading-none">
            {/* The brand follows the same rule as every heading: one accent word. */}
            <span className="block truncate font-display text-[17px] font-semibold tracking-tight text-[var(--foreground)]">
              {lang === 'hi' ? 'संस्कृति' : 'Sanskriti'}{' '}
              <span className="text-accent-word">{lang === 'hi' ? 'एआई' : 'AI'}</span>
            </span>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              {lang === 'hi' ? 'जीवित विरासत' : 'Living Heritage'}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <LanguageSelect />
          <ThemeToggle />
          <Link
            href="/profile"
            className="grid h-10 w-10 place-items-center rounded-full bg-[var(--card)] text-[var(--foreground)] shadow-[var(--shadow-card)] transition-transform active:scale-95"
            aria-label="Open profile"
          >
            {profile?.full_name || profile?.username ? (
              <span className="font-display text-[12px] font-semibold tracking-tight">{initials}</span>
            ) : (
              <UserRound className="h-[18px] w-[18px]" />
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
