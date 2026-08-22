'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Globe, UserRound } from 'lucide-react'
import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/authContext'
import { useLang } from '@/lib/languageContext'
import { cn } from '@/lib/utils'
import { SUPPORTED_LANGUAGES } from '@/lib/languages'

export function TopBar() {
  const { profile } = useAuth()
  const { lang, setLang } = useLang()
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

  if (normalizedPathname === '/login' || normalizedPathname === '/auth') return null

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#13131a]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] w-full max-w-[420px] items-center justify-between px-6 py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-[#f2ca50]/20 bg-[#0e1222] shadow-[0_12px_28px_rgba(242,202,80,0.12)]">
            <Image src="/sanskriti-logo.svg" alt="Sanskriti AI logo" width={40} height={40} className="h-full w-full object-cover" priority />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold tracking-tight text-[#F5E6D3]">{lang === 'hi' ? 'संस्कृति AI' : 'Sanskriti AI'}</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#8C7B63]">{lang === 'hi' ? 'जीवित विरासत' : 'Living Heritage'}</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <label
            data-no-translate
            className={cn(
              'relative inline-flex items-center gap-1 rounded-full border py-2 pl-2 pr-1 text-[11px] font-bold tracking-tight transition-colors',
              'border-[#f2ca50]/20 bg-[#f2ca50]/10 text-[#f7d88c] hover:bg-[#f2ca50]/15'
            )}
          >
            <Globe className="h-4 w-4" />
            <span className="sr-only">Select language</span>
            <select
              aria-label="Select site and narration language"
              value={lang}
              onChange={(event) => setLang(event.target.value as typeof lang)}
              className="w-[72px] cursor-pointer appearance-none bg-transparent pr-4 text-[#f7d88c] outline-none"
            >
              {SUPPORTED_LANGUAGES.map((language) => (
                <option key={language.id} value={language.id} className="bg-[#13131a] text-[#F5E6D3]">
                  {language.id.toUpperCase()} · {language.nativeName}
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="pointer-events-none absolute right-2 text-[8px]">▼</span>
          </label>

          <Link
            href="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#F5E6D3]"
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
