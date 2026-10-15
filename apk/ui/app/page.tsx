'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Camera, CheckCircle2, Clock3, Compass, Download, MapPin, Route, ShoppingBag, Ticket, Trophy } from 'lucide-react'
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
      <div className="screen-gutter flex flex-col gap-7 py-6 animate-fade-in">
        {/* Greeting. One accent word, as everywhere else. */}
        <section>
          <p className="eyebrow">Good evening, {displayName}</p>
          <h1 className="mt-2.5 max-w-[18.5rem] font-display text-[1.95rem] font-semibold leading-[1.08] tracking-[-0.03em] text-[var(--foreground)]">
            What would you like to <span className="text-accent-word">discover?</span>
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="status-chip"><Download className="h-3.5 w-3.5" /> Offline ready</span>
            <span className="status-chip"><MapPin className="h-3.5 w-3.5" /> Agra</span>
          </div>
        </section>

        {/* Primary action, image-forward. */}
        <Link href="/recognition" className="group relative block h-[216px] overflow-hidden rounded-[30px] shadow-[var(--shadow-raised)]">
          <Image src="/hero-monuments.png" alt="" fill sizes="420px" className="object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(14,16,11,0.86)] via-[rgba(14,16,11,0.3)] to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
            <div className="min-w-0">
              <span className="photo-chip mb-3 inline-flex"><Camera className="h-3.5 w-3.5" /> Camera or photo</span>
              <h2 className="font-display text-[26px] font-semibold leading-tight tracking-[-0.025em] text-white">
                Scan a <span className="text-[var(--primary)]">monument</span>
              </h2>
              <p className="mt-1 text-[13px] leading-5 text-white/75">Identify it and hear its story</p>
            </div>
            <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-amber)] transition-transform group-active:scale-95">
              <ArrowRight className="h-5 w-5" />
            </span>
          </div>
        </Link>

        <section className="grid grid-cols-2 gap-3" aria-label="Quick actions">
          {quickActions.map((item) => (
            <Link key={item.href} href={item.href} className="surface p-4 transition-transform active:scale-[0.98]">
              <span className="mb-3.5 grid h-11 w-11 place-items-center rounded-2xl bg-[var(--muted)] text-[var(--foreground)]">
                <item.icon className="h-[19px] w-[19px]" />
              </span>
              <p className="text-[14px] font-bold text-[var(--foreground)]">{item.label}</p>
              <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{item.detail}</p>
            </Link>
          ))}
        </section>

        <Link href="/marketplace" className="surface-ink flex items-center gap-4 p-5 transition-transform active:scale-[0.99]">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-[var(--primary)]">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[17px] font-semibold tracking-tight">Local art near monuments</span>
            <span className="mt-1 block text-[12px] leading-5 opacity-70">Reserve crafts and meet verified artisans</span>
          </span>
          <ArrowRight className="h-[18px] w-[18px] shrink-0 opacity-70" />
        </Link>

        <section>
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="section-title">Continue your journey</h2>
            <Link href="/explore" className="text-[12px] font-bold text-[var(--foreground)]">View route</Link>
          </div>
          <Link href="/explore" className="surface flex items-center gap-4 p-4 transition-transform active:scale-[0.99]">
            <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[20px] bg-[var(--muted)]">
              <Image src="/hero-monuments.png" alt="" fill sizes="72px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-[var(--foreground)]">Taj Mahal tour</p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">Zone 1 of 19</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
              </div>
              <div className="mt-3 h-[6px] overflow-hidden rounded-full bg-[var(--muted)]">
                <div className="h-full w-[6%] rounded-full bg-[var(--primary)]" />
              </div>
              <p className="mt-2 text-[11px] font-semibold text-[var(--muted-foreground)]">Resume exploration</p>
            </div>
          </Link>
        </section>

        <section>
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="section-title">Recommended near you</h2>
            <Compass className="h-4 w-4 text-[var(--muted-foreground)]" />
          </div>
          <div className="surface overflow-hidden">
            {nearby.map((place, index) => (
              <Link
                key={place.name}
                href={place.href}
                className={`flex min-h-[76px] items-center gap-3.5 px-4 py-3.5 ${index > 0 ? 'border-t border-[var(--border)]' : ''}`}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--muted)] text-[var(--foreground)]">
                  <MapPin className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold text-[var(--foreground)]">{place.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
                    <Clock3 className="h-3 w-3" /> {place.meta}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" />
              </Link>
            ))}
          </div>
        </section>

        <div className="surface-quiet flex items-center justify-between px-4 py-3.5 text-[12px]">
          <span className="flex items-center gap-2 font-bold text-[var(--foreground)]">
            <CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> Ready for offline exploring
          </span>
          <span className="text-[var(--muted-foreground)]">Updated today</span>
        </div>
        <div className="h-2" />
      </div>
    </AppShell>
  )
}
