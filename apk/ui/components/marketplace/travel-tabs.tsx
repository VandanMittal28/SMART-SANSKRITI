'use client'

import Link from 'next/link'
import { useLang } from '@/lib/languageContext'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/tickets', en: 'Tickets', hi: 'टिकट', key: 'tickets' },
  { href: '/marketplace', en: 'Local Art', hi: 'स्थानीय कला', key: 'marketplace' },
  { href: '/itinerary', en: 'My Plans', hi: 'मेरी योजनाएं', key: 'itinerary' },
] as const

export function TravelTabs({ active }: { active: typeof tabs[number]['key'] }) {
  const { lang } = useLang()
  return (
    <nav className="grid grid-cols-3 rounded-xl bg-[#11182B] p-1" aria-label={lang === 'hi' ? 'यात्रा सेवाएं' : 'Trip services'}>
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? 'page' : undefined}
          className={cn(
            'grid min-h-10 place-items-center rounded-lg px-1 text-center text-[12px] font-bold transition-colors',
            active === tab.key ? 'bg-[#D6A84B] text-[#171004]' : 'text-[#AEB6C8]',
          )}
        >
          {lang === 'hi' ? tab.hi : tab.en}
        </Link>
      ))}
    </nav>
  )
}

