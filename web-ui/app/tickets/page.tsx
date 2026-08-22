'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  UsersRound,
  X,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useLang } from '@/lib/languageContext'
import {
  ticketMonuments,
  visitorLabels,
  type TicketMonument,
  type VisitorType,
} from '@/lib/ticketMonuments'

type Screen = 'browse' | 'checkout' | 'success'
const FIRST_BOOKING_KEY = 'sanskriti_first_ticket_booked'

const today = () => {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().split('T')[0]
}

export default function TicketsPage() {
  const { lang } = useLang()
  const hi = lang === 'hi'
  const [screen, setScreen] = useState<Screen>('browse')
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('All')
  const [visitorType, setVisitorType] = useState<VisitorType>('indian')
  const [selected, setSelected] = useState<TicketMonument | null>(null)
  const [visitDate, setVisitDate] = useState(today)
  const [quantity, setQuantity] = useState(1)
  const [coupon, setCoupon] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponMessage, setCouponMessage] = useState('')
  const [hasBookedBefore, setHasBookedBefore] = useState(false)
  const [bookingId, setBookingId] = useState('')

  useEffect(() => {
    setHasBookedBefore(localStorage.getItem(FIRST_BOOKING_KEY) === 'true')
  }, [])

  const cities = useMemo(
    () => ['All', ...Array.from(new Set(ticketMonuments.map((item) => item.city)))],
    [],
  )

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return ticketMonuments.filter((item) => {
      const matchesCity = city === 'All' || item.city === city
      const matchesQuery =
        !normalized ||
        `${item.name} ${item.nameHi} ${item.city} ${item.state}`.toLowerCase().includes(normalized)
      return matchesCity && matchesQuery
    })
  }, [city, query])

  const unitPrice = selected?.prices[visitorType] ?? 0
  const subtotal = unitPrice * quantity
  const discount = couponApplied ? Math.min(unitPrice, subtotal) : 0
  const total = subtotal - discount

  const startCheckout = (monument: TicketMonument) => {
    setSelected(monument)
    setQuantity(1)
    setCoupon('')
    setCouponApplied(false)
    setCouponMessage('')
    setScreen('checkout')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const applyCoupon = () => {
    if (coupon.trim().toUpperCase() !== 'FIRSTFREE') {
      setCouponApplied(false)
      setCouponMessage(hi ? 'कूपन कोड सही नहीं है।' : 'That coupon code is not valid.')
      return
    }
    if (hasBookedBefore) {
      setCouponApplied(false)
      setCouponMessage(hi ? 'यह ऑफर केवल पहली बुकिंग के लिए है।' : 'This offer is only for your first booking.')
      return
    }
    setCouponApplied(true)
    setCouponMessage(hi ? 'बधाई! एक टिकट मुफ़्त हो गया।' : 'Success! One ticket is now free.')
  }

  const confirmBooking = () => {
    const reference = `SA-${Date.now().toString().slice(-8)}`
    setBookingId(reference)
    localStorage.setItem(FIRST_BOOKING_KEY, 'true')
    setHasBookedBefore(true)
    setScreen('success')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (screen === 'success' && selected) {
    return (
      <AppShell>
        <div className="px-4 py-8">
          <section className="app-card overflow-hidden rounded-[28px] p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#4B9B8E]/15 text-[#7EE4D4]">
              <BadgeCheck className="h-8 w-8" />
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-[#7EE4D4]">
              {hi ? 'बुकिंग तैयार है' : 'Booking ready'}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[#F5E6D3]">
              {hi ? 'आपका टिकट आरक्षित है' : 'Your ticket is reserved'}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#C4A882]">
              {hi
                ? 'अंतिम सरकारी ई-टिकट के लिए आधिकारिक पोर्टल पर विवरण पूरा करें।'
                : 'Complete the details on the official portal to receive the final government e-ticket.'}
            </p>

            <div className="mt-6 rounded-[22px] border border-dashed border-[#C9A84C]/35 bg-[#C9A84C]/8 p-5 text-left">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selected.emoji}</span>
                <div>
                  <p className="font-semibold text-[#F5E6D3]">{hi ? selected.nameHi : selected.name}</p>
                  <p className="text-xs text-[#A89A7D]">{selected.city} · {visitDate}</p>
                </div>
              </div>
              <div className="my-4 h-px bg-white/8" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-[#8C7B63]">{hi ? 'बुकिंग आईडी' : 'Booking ID'}</p>
                  <p className="mt-1 font-semibold text-[#F7D88C]">{bookingId}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8C7B63]">{hi ? 'कुल' : 'Total'}</p>
                  <p className="mt-1 font-semibold text-[#F5E6D3]">₹{total.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            <a
              href={selected.officialUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C9A84C] px-4 py-3.5 font-bold text-[#0E0916]"
            >
              {hi ? 'आधिकारिक बुकिंग पूरी करें' : 'Complete official booking'}
              <ChevronRight className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() => setScreen('browse')}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[#D9C7AA]"
            >
              {hi ? 'और स्मारक देखें' : 'Explore more monuments'}
            </button>
          </section>
        </div>
      </AppShell>
    )
  }

  if (screen === 'checkout' && selected) {
    return (
      <AppShell>
        <div className="px-4 py-4">
          <button
            type="button"
            onClick={() => setScreen('browse')}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#D9C7AA]"
          >
            <ArrowLeft className="h-4 w-4" />
            {hi ? 'स्मारकों पर वापस' : 'Back to monuments'}
          </button>

          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9A84C]">
              {hi ? 'सुरक्षित चेकआउट' : 'Secure checkout'}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[#F5E6D3]">
              {hi ? 'अपनी यात्रा पूरी करें' : 'Complete your visit'}
            </h1>
          </div>

          <section className="app-card rounded-[24px] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C9A84C]/12 text-2xl">
                {selected.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-[#F5E6D3]">{hi ? selected.nameHi : selected.name}</h2>
                <p className="text-xs text-[#A89A7D]">{selected.city}, {selected.state}</p>
              </div>
              <span className="rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/10 px-2 py-1 text-[10px] font-bold text-[#F7D88C]">
                {selected.category}
              </span>
            </div>

            {selected.note && (
              <div className="mt-4 flex gap-2 rounded-2xl bg-white/5 p-3 text-xs leading-5 text-[#C4A882]">
                <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-[#F7D88C]" />
                <span>{hi ? selected.noteHi : selected.note}</span>
              </div>
            )}
          </section>

          <section className="app-card mt-3 space-y-5 rounded-[24px] p-4">
            <div>
              <label htmlFor="visit-date" className="flex items-center gap-2 text-sm font-semibold text-[#F5E6D3]">
                <CalendarDays className="h-4 w-4 text-[#F7D88C]" />
                {hi ? 'यात्रा की तारीख' : 'Visit date'}
              </label>
              <input
                id="visit-date"
                type="date"
                min={today()}
                value={visitDate}
                onChange={(event) => setVisitDate(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0B1020] px-4 py-3 text-sm text-[#F5E6D3] [color-scheme:dark]"
              />
            </div>

            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-[#F5E6D3]">
                <UsersRound className="h-4 w-4 text-[#F7D88C]" />
                {hi ? 'पर्यटक श्रेणी' : 'Visitor category'}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(visitorLabels) as VisitorType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setVisitorType(type)
                      setCouponApplied(false)
                      setCouponMessage('')
                    }}
                    className={`rounded-2xl border px-3 py-3 text-left text-xs font-semibold transition-colors ${
                      visitorType === type
                        ? 'border-[#C9A84C]/50 bg-[#C9A84C]/15 text-[#F7D88C]'
                        : 'border-white/8 bg-white/4 text-[#C4A882]'
                    }`}
                  >
                    {visitorLabels[type][hi ? 'hi' : 'en']}
                    <span className="mt-1 block text-sm text-[#F5E6D3]">
                      {selected.prices[type] === 0 ? (hi ? 'मुफ़्त' : 'Free') : `₹${selected.prices[type]}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#F5E6D3]">{hi ? 'टिकट' : 'Tickets'}</p>
                <p className="text-xs text-[#8C7B63]">{hi ? 'अधिकतम 10 टिकट' : 'Up to 10 tickets'}</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0B1020] p-1">
                <button
                  type="button"
                  aria-label={hi ? 'एक टिकट घटाएं' : 'Remove one ticket'}
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#D9C7AA] disabled:opacity-35"
                  disabled={quantity === 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-5 text-center font-bold text-[#F5E6D3]">{quantity}</span>
                <button
                  type="button"
                  aria-label={hi ? 'एक टिकट जोड़ें' : 'Add one ticket'}
                  onClick={() => setQuantity((value) => Math.min(10, value + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-[#F7D88C] disabled:opacity-35"
                  disabled={quantity === 10}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          <section className="mt-3 overflow-hidden rounded-[24px] border border-[#7EE4D4]/20 bg-[#4B9B8E]/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#4B9B8E]/15 text-[#7EE4D4]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-[#E9FFF9]">
                  {hi ? 'पहली बुकिंग पर 1 टिकट मुफ़्त' : '1 free ticket on your first booking'}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#A9D7CE]">
                  {hi ? 'कूपन कोड FIRSTFREE लगाएँ।' : 'Apply coupon code FIRSTFREE below.'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <input
                  aria-label={hi ? 'कूपन कोड' : 'Coupon code'}
                  value={coupon}
                  onChange={(event) => {
                    setCoupon(event.target.value.toUpperCase())
                    setCouponMessage('')
                    setCouponApplied(false)
                  }}
                  placeholder="FIRSTFREE"
                  className="w-full rounded-2xl border border-[#7EE4D4]/20 bg-[#071716]/65 px-4 py-3 pr-10 text-sm font-bold uppercase tracking-[0.12em] text-[#E9FFF9] outline-none placeholder:text-[#76A49B]"
                />
                {couponApplied && <Check className="absolute right-3 top-3.5 h-4 w-4 text-[#7EE4D4]" />}
              </div>
              <button
                type="button"
                onClick={applyCoupon}
                className="rounded-2xl bg-[#7EE4D4] px-4 text-sm font-bold text-[#071716]"
              >
                {hi ? 'लगाएँ' : 'Apply'}
              </button>
            </div>
            {couponMessage && (
              <p className={`mt-2 text-xs ${couponApplied ? 'text-[#7EE4D4]' : 'text-[#FFB3A1]'}`}>
                {couponMessage}
              </p>
            )}
          </section>

          <section className="app-card mt-3 rounded-[24px] p-4">
            <h2 className="font-semibold text-[#F5E6D3]">{hi ? 'भुगतान सारांश' : 'Payment summary'}</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between text-[#C4A882]">
                <span>{hi ? `${quantity} × प्रवेश टिकट` : `${quantity} × entry ticket`}</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#7EE4D4]">
                  <span>{hi ? 'पहला टिकट मुफ़्त' : 'First ticket free'}</span>
                  <span>−₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="h-px bg-white/8" />
              <div className="flex items-end justify-between">
                <span className="font-semibold text-[#F5E6D3]">{hi ? 'कुल भुगतान' : 'Total payable'}</span>
                <span className="text-2xl font-bold text-[#F7D88C]">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={confirmBooking}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C9A84C] px-4 py-4 font-bold text-[#0E0916] shadow-[0_14px_32px_rgba(201,168,76,0.18)]"
          >
            <ShieldCheck className="h-5 w-5" />
            {total === 0 ? (hi ? 'मुफ़्त टिकट आरक्षित करें' : 'Reserve free ticket') : (hi ? 'बुकिंग जारी रखें' : 'Continue booking')}
          </button>
          <p className="mt-3 px-3 text-center text-[11px] leading-5 text-[#8C7B63]">
            {hi
              ? 'अंतिम कीमत और उपलब्धता आधिकारिक पोर्टल पर सत्यापित होगी।'
              : 'Final price and availability are verified on the official booking portal.'}
          </p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="px-4 py-4">
        <section className="relative overflow-hidden rounded-[28px] border border-[#C9A84C]/20 bg-[radial-gradient(circle_at_top_right,rgba(201,168,76,0.22),transparent_42%),linear-gradient(145deg,#17142a,#0b1020)] p-5">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#F7D88C]">
              <Ticket className="h-4 w-4" />
              {hi ? 'स्मारक टिकट' : 'Monument tickets'}
            </div>
            <h1 className="mt-3 max-w-[280px] text-3xl font-semibold leading-tight text-[#F5E6D3]">
              {hi ? 'भारत की विरासत, एक ही जगह' : "India's heritage, one checkout"}
            </h1>
            <p className="mt-2 max-w-[310px] text-sm leading-6 text-[#C4A882]">
              {hi ? '25 लोकप्रिय स्मारकों की वास्तविक प्रवेश दरें देखें और यात्रा आरक्षित करें।' : 'Compare current entry rates and reserve visits across 25 popular monuments.'}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#7EE4D4]/20 bg-[#4B9B8E]/10 px-3 py-2 text-xs font-semibold text-[#A9EADD]">
              <Sparkles className="h-4 w-4" />
              {hi ? 'पहली बुकिंग पर 1 टिकट मुफ़्त · FIRSTFREE' : '1st booking: 1 ticket free · FIRSTFREE'}
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-5 -right-2 text-[92px] opacity-20">🏛️</div>
        </section>

        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-[#8C7B63]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={hi ? 'स्मारक या शहर खोजें' : 'Search monument or city'}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-sm text-[#F5E6D3] outline-none placeholder:text-[#7A6E5C] focus:border-[#C9A84C]/40"
            />
            {query && (
              <button
                type="button"
                aria-label={hi ? 'खोज साफ़ करें' : 'Clear search'}
                onClick={() => setQuery('')}
                className="absolute right-3 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-[#A89A7D]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="app-scroll-row mt-3 flex gap-2 overflow-x-auto pb-1">
            {cities.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCity(item)}
                className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold ${
                  city === item
                    ? 'border-[#C9A84C]/45 bg-[#C9A84C]/15 text-[#F7D88C]'
                    : 'border-white/8 bg-white/4 text-[#A89A7D]'
                }`}
              >
                {item === 'All' ? (hi ? 'सभी' : 'All') : item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8C7B63]">{hi ? 'खोजें' : 'Explore'}</p>
            <h2 className="mt-1 text-lg font-semibold text-[#F5E6D3]">
              {hi ? `${filtered.length} स्मारक` : `${filtered.length} monuments`}
            </h2>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-[#8C7B63]">
            <ShieldCheck className="h-3.5 w-3.5" />
            {hi ? 'आधिकारिक दरें' : 'Official rates'}
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {filtered.map((monument) => {
            const price = monument.prices[visitorType]
            return (
              <article key={monument.id} className="app-card rounded-[24px] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-[linear-gradient(145deg,rgba(201,168,76,0.16),rgba(83,74,183,0.12))] text-2xl">
                    {monument.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold leading-tight text-[#F5E6D3]">
                          {hi ? monument.nameHi : monument.name}
                        </h3>
                        <p className="mt-1 text-xs text-[#A89A7D]">{monument.city}, {monument.state}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#8C7B63]">
                        {monument.category}
                      </span>
                    </div>
                    {monument.note && (
                      <p className="mt-2 line-clamp-1 text-[11px] text-[#8C7B63]">
                        {hi ? monument.noteHi : monument.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/7 pt-3">
                  <div>
                    <select
                      aria-label={hi ? 'पर्यटक श्रेणी' : 'Visitor category'}
                      value={visitorType}
                      onChange={(event) => setVisitorType(event.target.value as VisitorType)}
                      className="max-w-[160px] bg-transparent text-[11px] font-semibold text-[#A89A7D] outline-none [color-scheme:dark]"
                    >
                      {(Object.keys(visitorLabels) as VisitorType[]).map((type) => (
                        <option key={type} value={type}>{visitorLabels[type][hi ? 'hi' : 'en']}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xl font-bold text-[#F7D88C]">
                      {price === 0 ? (hi ? 'मुफ़्त' : 'Free') : `₹${price.toLocaleString('en-IN')}`}
                    </p>
                    <p className="text-[10px] text-[#7A6E5C]">{hi ? 'प्रति व्यक्ति से' : 'per person'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startCheckout(monument)}
                    className="flex items-center gap-2 rounded-2xl bg-[#C9A84C] px-4 py-3 text-xs font-bold text-[#0E0916]"
                  >
                    {price === 0 ? (hi ? 'देखें' : 'View') : (hi ? 'टिकट लें' : 'Get tickets')}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            )
          })}

          {filtered.length === 0 && (
            <div className="app-card rounded-[24px] px-5 py-10 text-center">
              <Search className="mx-auto h-6 w-6 text-[#8C7B63]" />
              <p className="mt-3 font-semibold text-[#F5E6D3]">{hi ? 'कोई स्मारक नहीं मिला' : 'No monument found'}</p>
              <button type="button" onClick={() => { setQuery(''); setCity('All') }} className="mt-3 text-sm font-semibold text-[#F7D88C]">
                {hi ? 'सभी स्मारक देखें' : 'Show all monuments'}
              </button>
            </div>
          )}
        </div>

        <section className="mt-5 rounded-[24px] border border-white/8 bg-white/4 p-4">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#7EE4D4]" />
            <div>
              <p className="text-sm font-semibold text-[#F5E6D3]">{hi ? 'कीमत संबंधी जानकारी' : 'About these prices'}</p>
              <p className="mt-1 text-xs leading-5 text-[#8C7B63]">
                {hi
                  ? 'दरें सरकारी स्रोतों के अनुसार अपडेट की गई हैं। तारीख, विशेष शो और ऑन-साइट शुल्क के कारण अंतिम राशि बदल सकती है।'
                  : 'Rates are updated from government sources. Date, special shows, and on-site charges may change the final amount.'}
              </p>
              <Link href="https://asi.payumoney.com/" target="_blank" className="mt-2 inline-flex text-xs font-semibold text-[#F7D88C]">
                {hi ? 'ASI आधिकारिक पोर्टल देखें' : 'View ASI official portal'}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
