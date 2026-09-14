'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, BadgeCheck, CalendarClock, CheckCircle2, ChevronRight, Languages, MapPin, Minus, PackageCheck, Plus, ShieldCheck, Store, UsersRound } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/lib/authContext'
import { useLang } from '@/lib/languageContext'
import { addMarketplaceReservationToItinerary, loadMarketplaceListing, reserveMarketplaceListing } from '@/lib/marketplace/client'
import type { MarketplaceListing, MarketplaceReservation } from '@/lib/marketplace/types'

function tomorrowDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

function formatSlot(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export function MarketplaceDetailClient() {
  const params = useSearchParams()
  const id = params.get('id') ?? ''
  const { user } = useAuth()
  const { lang } = useLang()
  const hi = lang === 'hi'
  const [listing, setListing] = useState<MarketplaceListing | null>(null)
  const [demo, setDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [pickupDate, setPickupDate] = useState(tomorrowDate)
  const [slotId, setSlotId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [reservation, setReservation] = useState<MarketplaceReservation | null>(null)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    let active = true
    void loadMarketplaceListing(id).then((result) => {
      if (!active) return
      setListing(result.listing)
      setDemo(result.demo)
      setSlotId(result.listing?.slots.find((slot) => slot.reservedQuantity + slot.heldQuantity < slot.capacity)?.id ?? '')
      setLoading(false)
    })
    return () => { active = false }
  }, [id])

  const selectedSlot = listing?.slots.find((slot) => slot.id === slotId)
  const total = (listing?.price ?? 0) * quantity
  const deposit = Math.ceil(total * (listing?.depositPercent ?? 20) / 100)
  const canReserve = Boolean(listing && user && (listing.kind === 'craft' || selectedSlot))
  const maxQuantity = useMemo(() => {
    if (!listing) return 1
    if (listing.kind === 'craft') return Math.max(1, Math.min(10, listing.stockQuantity ?? 1))
    return Math.max(1, Math.min(10, (selectedSlot?.capacity ?? 1) - (selectedSlot?.reservedQuantity ?? 0) - (selectedSlot?.heldQuantity ?? 0)))
  }, [listing, selectedSlot])

  const reserve = async () => {
    if (!listing || !user) return
    setSubmitting(true)
    setError('')
    try {
      const scheduledFor = listing.kind === 'workshop' && selectedSlot
        ? selectedSlot.startsAt
        : new Date(`${pickupDate}T12:00:00`).toISOString()
      const result = await reserveMarketplaceListing({ userId: user.id, listing, quantity, slotId: selectedSlot?.id, scheduledFor })
      setReservation(result)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (hi ? 'बुकिंग पूरी नहीं हो सकी।' : 'The reservation could not be completed.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <AppShell><div className="grid min-h-[70vh] place-items-center"><Spinner className="size-9 text-[#D6A84B]" /></div></AppShell>
  if (!listing) return <AppShell><div className="screen-gutter py-10 text-center"><Store className="mx-auto h-8 w-8 text-[#8891A6]" /><h1 className="mt-3 text-xl font-bold text-[#F6F1E8]">{hi ? 'लिस्टिंग नहीं मिली' : 'Listing not found'}</h1><Link href="/marketplace" className="mt-4 inline-flex text-sm font-bold text-[#D6A84B]">{hi ? 'बाज़ार पर वापस जाएं' : 'Back to marketplace'}</Link></div></AppShell>

  if (reservation) {
    return (
      <AppShell>
        <div className="screen-gutter py-6">
          <section className="app-card rounded-[28px] p-5 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#63C7BA]/15 text-[#7EE4D4]"><CheckCircle2 className="h-8 w-8" /></span>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-[#63C7BA]">{reservation.testMode ? (hi ? 'पायलट बुकिंग' : 'Pilot reservation') : (hi ? 'भुगतान सत्यापित' : 'Payment verified')}</p>
            <h1 className="mt-2 font-heritage text-2xl font-bold text-[#F6F1E8]">{hi ? 'आपकी कला आरक्षित है' : 'Your local art is reserved'}</h1>
            <p className="mt-2 text-sm leading-6 text-[#AEB6C8]">{hi ? 'पिकअप या कार्यशाला में यह QR या PIN कारीगर को दिखाएं।' : 'Show this QR or PIN to the artisan at pickup or the workshop.'}</p>

            <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3"><QRCodeSVG value={`sanskriti://marketplace/reservation/${reservation.qrToken}`} size={150} level="M" /></div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8891A6]">{hi ? 'पुष्टि PIN' : 'Confirmation PIN'}</p>
            <p className="mt-1 font-mono text-3xl font-black tracking-[0.24em] text-[#F7D88C]">{reservation.confirmationPin}</p>

            <div className="mt-5 rounded-2xl border border-[#D6A84B]/25 bg-[#D6A84B]/[0.07] p-4 text-left">
              <p className="font-bold text-[#F6F1E8]">{hi ? listing.titleHi : listing.title}</p>
              <p className="mt-1 text-xs text-[#AEB6C8]">{listing.artisan.name} · {formatSlot(reservation.scheduledFor, hi ? 'hi-IN' : 'en-IN')}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/8 pt-3 text-xs">
                <div><p className="text-[#8891A6]">{hi ? 'अग्रिम भुगतान' : 'Advance paid'}</p><p className="mt-1 font-bold text-[#63C7BA]">₹{reservation.deposit.toLocaleString('en-IN')}</p></div>
                <div><p className="text-[#8891A6]">{hi ? 'बाकी राशि' : 'Balance at visit'}</p><p className="mt-1 font-bold text-[#F7D88C]">₹{reservation.balance.toLocaleString('en-IN')}</p></div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white/5 p-4 text-left">
              <p className="flex items-center gap-2 text-xs font-bold text-[#F6F1E8]"><MapPin className="h-4 w-4 text-[#D6A84B]" /> {hi ? 'पिकअप विवरण' : 'Pickup details'}</p>
              <p className="mt-2 text-xs leading-5 text-[#AEB6C8]">{reservation.exactPickupAddress}</p>
              <p className="mt-2 text-[11px] leading-5 text-[#8891A6]">{reservation.pickupInstructions}</p>
            </div>

            <button type="button" disabled={added} onClick={() => { addMarketplaceReservationToItinerary(reservation); setAdded(true) }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D6A84B] px-4 py-3.5 text-sm font-black text-[#171004] disabled:opacity-70"><CalendarClock className="h-4 w-4" /> {added ? (hi ? 'योजना में जोड़ा गया' : 'Added to your plan') : (hi ? 'यात्रा योजना में जोड़ें' : 'Add to itinerary')}</button>
            <Link href="/marketplace/bookings" className="mt-3 grid min-h-12 place-items-center rounded-2xl border border-white/10 text-sm font-bold text-[#D9C7AA]">{hi ? 'मेरी बुकिंग देखें' : 'View my bookings'}</Link>
          </section>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="pb-7">
        <div className="screen-gutter pt-4"><Link href="/marketplace" className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-[#AEB6C8]"><ArrowLeft className="h-4 w-4" /> {hi ? 'स्थानीय कला' : 'Local art'}</Link></div>
        <div className="relative mt-1 h-64 bg-[#171F34]">
          <Image src={listing.imageUrl} alt={listing.imageAlt} fill sizes="(max-width: 420px) 100vw, 420px" className="object-cover" priority />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#080D1D] to-transparent" />
          <span className="absolute bottom-4 left-5 rounded-full bg-[#D6A84B] px-3 py-1.5 text-[10px] font-black text-[#171004]">{listing.kind === 'craft' ? (hi ? 'हस्तशिल्प पिकअप' : 'Craft pickup') : (hi ? 'लाइव कार्यशाला' : 'Live workshop')}</span>
        </div>

        <div className="screen-gutter -mt-1 relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D6A84B]">{listing.craftType}</p>
          <h1 className="mt-1 font-heritage text-[27px] font-bold leading-9 text-[#F6F1E8]">{hi ? listing.titleHi : listing.title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#C7CDDA]">{hi ? listing.descriptionHi : listing.description}</p>

          <section className="mt-4 rounded-2xl border border-[#63C7BA]/22 bg-[#63C7BA]/[0.06] p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#63C7BA]/14 text-lg font-black text-[#8DE0D6]">{listing.artisan.name.slice(0, 1)}</span>
              <div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 font-bold text-[#F6F1E8]">{listing.artisan.name}<BadgeCheck className="h-4 w-4 text-[#63C7BA]" /></p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[#63C7BA]">{hi ? 'सत्यापित स्थानीय कारीगर' : 'Verified local artisan'}</p></div>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#AEB6C8]">{listing.artisan.story}</p>
            <div className="mt-3 flex flex-wrap gap-2">{listing.artisan.languages.map((item) => <span key={item} className="flex items-center gap-1 rounded-full border border-white/8 px-2.5 py-1 text-[10px] text-[#AEB6C8]"><Languages className="h-3 w-3" />{item}</span>)}</div>
          </section>

          <section className="app-card mt-4 rounded-2xl p-4">
            <div className="flex items-center justify-between"><div><p className="text-xs text-[#8891A6]">{hi ? 'कुल कीमत' : 'Total price'}</p><p className="mt-1 text-2xl font-black text-[#F7D88C]">₹{total.toLocaleString('en-IN')}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label={hi ? 'मात्रा घटाएं' : 'Decrease quantity'} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-[#D9C7AA]"><Minus className="h-4 w-4" /></button><span className="w-6 text-center font-black text-[#F6F1E8]">{quantity}</span><button type="button" onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))} aria-label={hi ? 'मात्रा बढ़ाएं' : 'Increase quantity'} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-[#D9C7AA]"><Plus className="h-4 w-4" /></button></div></div>

            {listing.kind === 'craft' ? (
              <label className="mt-4 block text-xs font-bold text-[#AEB6C8]">{hi ? 'पसंदीदा पिकअप तारीख' : 'Preferred pickup date'}<input type="date" min={tomorrowDate()} value={pickupDate} onChange={(event) => setPickupDate(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#171F34] p-3 text-sm text-[#F6F1E8]" /></label>
            ) : (
              <fieldset className="mt-4"><legend className="text-xs font-bold text-[#AEB6C8]">{hi ? 'कार्यशाला का समय चुनें' : 'Choose a workshop time'}</legend><div className="mt-2 space-y-2">{listing.slots.map((slot) => { const remaining = slot.capacity - slot.reservedQuantity - slot.heldQuantity; return <label key={slot.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${slotId === slot.id ? 'border-[#D6A84B]/50 bg-[#D6A84B]/10' : 'border-white/8 bg-white/[0.03]'}`}><span><span className="block text-xs font-bold text-[#F6F1E8]">{formatSlot(slot.startsAt, hi ? 'hi-IN' : 'en-IN')}</span><span className="mt-0.5 block text-[10px] text-[#8891A6]">{remaining} {hi ? 'स्थान बाकी' : 'places left'}</span></span><input type="radio" name="slot" value={slot.id} checked={slotId === slot.id} onChange={() => { setSlotId(slot.id); setQuantity(1) }} className="accent-[#D6A84B]" /></label> })}</div></fieldset>
            )}

            <div className="mt-4 rounded-xl border border-[#D6A84B]/20 bg-[#D6A84B]/[0.06] p-3">
              <div className="flex justify-between text-xs text-[#AEB6C8]"><span>{listing.depositPercent}% {hi ? 'अग्रिम भुगतान' : 'advance now'}</span><strong className="text-[#63C7BA]">₹{deposit.toLocaleString('en-IN')}</strong></div>
              <div className="mt-2 flex justify-between text-xs text-[#AEB6C8]"><span>{hi ? 'यात्रा पर शेष राशि' : 'Balance at visit'}</span><strong className="text-[#F6F1E8]">₹{(total - deposit).toLocaleString('en-IN')}</strong></div>
            </div>
          </section>

          <div className="mt-4 flex gap-2 rounded-xl border border-white/8 p-3 text-[11px] leading-5 text-[#8891A6]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D6A84B]" /><span>{listing.approximatePickupArea}, {listing.city} · {listing.distanceKm.toFixed(1)} km {hi ? `${listing.siteNameHi} से` : `from ${listing.siteName}`}. {hi ? 'सटीक पता बुकिंग के बाद मिलेगा।' : 'Exact address is shared after booking.'}</span></div>
          <div className="mt-3 flex gap-2 rounded-xl border border-white/8 p-3 text-[11px] leading-5 text-[#8891A6]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#63C7BA]" /><span>{hi ? '24 घंटे पहले रद्द करने पर अग्रिम राशि वापस होगी। कारीगर द्वारा रद्द करने पर पूरा रिफंड मिलेगा।' : 'Cancel at least 24 hours ahead for an advance refund. Artisan cancellations are always fully refunded.'}</span></div>

          {error ? <p role="alert" className="mt-3 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-200">{error}</p> : null}
          {!user ? <Link href="/login" className="mt-4 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#D6A84B] font-black text-[#171004]">{hi ? 'आरक्षित करने के लिए साइन इन करें' : 'Sign in to reserve'}<ChevronRight className="h-4 w-4" /></Link> : <button type="button" disabled={!canReserve || submitting} onClick={reserve} className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#D6A84B] px-4 font-black text-[#171004] disabled:opacity-50">{submitting ? <Spinner className="size-5" /> : listing.kind === 'craft' ? <PackageCheck className="h-5 w-5" /> : <UsersRound className="h-5 w-5" />}{submitting ? (hi ? 'सुरक्षित बुकिंग...' : 'Securing reservation...') : demo ? (hi ? `₹${deposit.toLocaleString('en-IN')} परीक्षण बुकिंग` : `Test reserve · ₹${deposit.toLocaleString('en-IN')} advance`) : (hi ? `₹${deposit.toLocaleString('en-IN')} अग्रिम भुगतान करें` : `Pay ₹${deposit.toLocaleString('en-IN')} advance`)}</button>}
        </div>
      </div>
    </AppShell>
  )
}
