'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Camera, CheckCircle2, Clock3, Compass, Download, MapPin, Route, Ticket, Trophy } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/lib/authContext'
import { useLang } from '@/lib/languageContext'

const quickActions = [
  { label: 'Explore nearby', detail: 'Tours & places', href: '/explore', icon: Compass },
  { label: 'Book tickets', detail: 'Official rates', href: '/tickets', icon: Ticket },
  { label: 'Plan a trip', detail: 'Personal itinerary', href: '/itinerary', icon: Route },
  { label: 'Heritage hunt', detail: 'Play on location', href: '/hunt', icon: Trophy },
]

const nearby = [
  { name: 'Agra Fort', meta: '2.4 km · Open until 6:00 PM', href: '/monument/agra-fort' },
  { name: 'Mehtab Bagh', meta: '3.1 km · Best at sunset', href: '/explore' },
]

export default function HomePage() {
  const { profile } = useAuth()
  const { t } = useLang()
  const displayName = profile?.full_name?.split(' ')[0] || profile?.username || t('explorer')

  return (
    <AppShell>
      <div className="screen-gutter flex flex-col gap-6 py-5 animate-fade-in">
        <section>
          <p className="text-sm font-semibold text-[#D6A84B]">Good evening, {displayName}</p>
          <h1 className="mt-1 max-w-[320px] font-heritage text-[28px] font-bold leading-9 text-[#F6F1E8]">What would you like to discover?</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="status-chip"><Download className="h-3.5 w-3.5" /> Offline content ready</span>
            <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.035] px-2.5 text-[11px] font-semibold text-[#AEB6C8]"><MapPin className="h-3.5 w-3.5" /> Agra</span>
          </div>
        </section>

        <Link href="/recognition" className="group relative min-h-[148px] overflow-hidden rounded-2xl border border-[#D6A84B]/22 bg-[#171F34] p-5 transition-colors active:bg-[#1D2740]">
          <div className="relative z-10 max-w-[245px]">
            <span className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[#D6A84B]/12 text-[#E8BE69]"><Camera className="h-5 w-5" /></span>
            <h2 className="font-heritage text-xl font-bold text-[#F6F1E8]">Scan a monument</h2>
            <p className="mt-1 text-sm leading-5 text-[#AEB6C8]">Point your camera or upload a photo</p>
          </div>
          <span className="absolute bottom-5 right-5 grid h-11 w-11 place-items-center rounded-full bg-[#D6A84B] text-[#171004] transition-transform group-active:scale-95"><ArrowRight className="h-5 w-5" /></span>
          <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border border-[#D6A84B]/10" />
        </Link>

        <section className="grid grid-cols-2 gap-3" aria-label="Quick actions">
          {quickActions.map((item) => (
            <Link key={item.href} href={item.href} className="min-h-[96px] rounded-2xl border border-white/8 bg-[#11182B] p-4 transition-colors active:bg-[#171F34]">
              <item.icon className="h-5 w-5 text-[#D6A84B]" />
              <p className="mt-3 text-sm font-bold text-[#F6F1E8]">{item.label}</p>
              <p className="mt-0.5 text-[11px] text-[#8891A6]">{item.detail}</p>
            </Link>
          ))}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">Continue your journey</h2>
            <Link href="/explore" className="text-xs font-bold text-[#D6A84B]">View route</Link>
          </div>
          <Link href="/explore" className="flex min-h-[106px] items-center gap-3 rounded-2xl border border-[#D6A84B]/16 bg-[#11182B] p-3.5">
            <div className="relative h-[78px] w-[82px] shrink-0 overflow-hidden rounded-xl bg-[#171F34]">
              <Image src="/hero-monuments.png" alt="Taj Mahal heritage route" fill sizes="82px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-bold text-[#F6F1E8]">Taj Mahal tour</p><p className="mt-0.5 text-xs text-[#AEB6C8]">Zone 1 of 19</p></div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#D6A84B]" />
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full w-[6%] rounded-full bg-[#D6A84B]" /></div>
              <p className="mt-2 text-[11px] font-semibold text-[#8891A6]">Resume exploration</p>
            </div>
          </Link>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="section-title">Recommended near you</h2><Compass className="h-4 w-4 text-[#8891A6]" /></div>
          <div className="divide-y divide-white/6 overflow-hidden rounded-2xl border border-white/8 bg-[#11182B]">
            {nearby.map((place) => (
              <Link key={place.name} href={place.href} className="flex min-h-[72px] items-center gap-3 px-4 py-3 active:bg-white/[0.03]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#D6A84B]/10 text-[#D6A84B]"><MapPin className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[#F6F1E8]">{place.name}</span><span className="mt-0.5 flex items-center gap-1 text-[11px] text-[#AEB6C8]"><Clock3 className="h-3 w-3" /> {place.meta}</span></span>
                <ArrowRight className="h-4 w-4 text-[#667086]" />
              </Link>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between rounded-xl border border-[#63C7BA]/16 bg-[#63C7BA]/[0.06] px-4 py-3 text-xs">
          <span className="flex items-center gap-2 font-semibold text-[#8DE0D6]"><CheckCircle2 className="h-4 w-4" /> Ready for offline exploring</span>
          <span className="text-[#AEB6C8]">Updated today</span>
        </div>
        <div className="h-3" />
      </div>
    </AppShell>
  )
}
