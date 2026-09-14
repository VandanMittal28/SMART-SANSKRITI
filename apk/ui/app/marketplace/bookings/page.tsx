'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, CalendarClock, CheckCircle2, MapPin, PackageCheck, RotateCcw, Store } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/lib/authContext'
import { useLang } from '@/lib/languageContext'
import { addMarketplaceReservationToItinerary, cancelMarketplaceReservation, loadMyMarketplaceReservations } from '@/lib/marketplace/client'
import type { MarketplaceReservation } from '@/lib/marketplace/types'

const statusStyle: Record<MarketplaceReservation['status'], string> = {
  payment_pending: 'bg-amber-400/12 text-amber-200', confirmed: 'bg-[#63C7BA]/12 text-[#8DE0D6]',
  cancelled: 'bg-white/7 text-[#AEB6C8]', refund_pending: 'bg-purple-400/12 text-purple-200',
  refunded: 'bg-blue-400/12 text-blue-200', completed: 'bg-[#D6A84B]/12 text-[#F7D88C]',
  expired: 'bg-white/7 text-[#8891A6]', no_show: 'bg-red-400/12 text-red-200',
}

export default function MarketplaceBookingsPage() {
  const { user } = useAuth()
  const { lang } = useLang()
  const hi = lang === 'hi'
  const [bookings, setBookings] = useState<MarketplaceReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    void loadMyMarketplaceReservations(user?.id).then((items) => {
      if (active) { setBookings(items); setLoading(false) }
    })
    return () => { active = false }
  }, [user?.id])

  const cancel = async (booking: MarketplaceReservation) => {
    if (!user) return
    setBusyId(booking.id)
    try {
      await cancelMarketplaceReservation(user.id, booking)
      setBookings(await loadMyMarketplaceReservations(user.id))
      setMessage(hi ? 'बुकिंग रद्द कर दी गई है। लागू रिफंड स्थिति ऊपर दिखाई गई है।' : 'Reservation cancelled. Any applicable refund is reflected above.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (hi ? 'रद्द नहीं हो सका।' : 'Cancellation failed.'))
    } finally { setBusyId('') }
  }

  return (
    <AppShell>
      <div className="screen-gutter py-5">
        <Link href="/marketplace" className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-[#AEB6C8]"><ArrowLeft className="h-4 w-4" /> {hi ? 'स्थानीय कला' : 'Local art'}</Link>
        <h1 className="mt-2 font-heritage text-[28px] font-bold text-[#F6F1E8]">{hi ? 'मेरी कला बुकिंग' : 'My art bookings'}</h1>
        <p className="mt-1 text-sm text-[#AEB6C8]">{hi ? 'पिकअप और कार्यशालाओं के लिए QR, PIN और भुगतान देखें।' : 'Find QR codes, PINs, payments, pickups, and workshops here.'}</p>
        {message ? <p role="status" className="mt-4 rounded-xl border border-[#63C7BA]/20 bg-[#63C7BA]/[0.06] p-3 text-xs leading-5 text-[#A9E5DB]">{message}</p> : null}

        {loading ? <div className="grid min-h-64 place-items-center"><Spinner className="size-8 text-[#D6A84B]" /></div> : bookings.length ? (
          <div className="mt-5 space-y-4">
            {bookings.map((booking) => {
              const canCancel = ['confirmed', 'payment_pending'].includes(booking.status)
              return (
                <article key={booking.id} className="app-card rounded-[24px] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D6A84B]">{booking.listingKind === 'craft' ? (hi ? 'हस्तशिल्प' : 'Craft pickup') : (hi ? 'कार्यशाला' : 'Workshop')}</p><h2 className="mt-1 font-bold leading-5 text-[#F6F1E8]">{booking.listingTitle}</h2><p className="mt-1 text-xs text-[#8891A6]">{booking.artisanName} · {booking.siteName}</p></div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${statusStyle[booking.status]}`}>{booking.status.replace('_', ' ')}</span>
                  </div>
                  <div className="mt-4 flex gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <div className="shrink-0 rounded-xl bg-white p-2"><QRCodeSVG value={`sanskriti://marketplace/reservation/${booking.qrToken}`} size={76} /></div>
                    <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-widest text-[#8891A6]">{hi ? 'पुष्टि PIN' : 'Confirmation PIN'}</p><p className="mt-1 font-mono text-xl font-black tracking-[0.16em] text-[#F7D88C]">{booking.confirmationPin}</p><p className="mt-2 flex items-start gap-1 text-[10px] leading-4 text-[#AEB6C8]"><CalendarClock className="mt-0.5 h-3 w-3 shrink-0" />{new Intl.DateTimeFormat(hi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(booking.scheduledFor))}</p></div>
                  </div>
                  {['confirmed', 'completed'].includes(booking.status) ? <div className="mt-3 rounded-xl border border-[#D6A84B]/18 bg-[#D6A84B]/[0.05] p-3"><p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#D6A84B]"><MapPin className="h-3.5 w-3.5" /> {hi ? 'पुष्टि किया गया स्थान' : 'Confirmed location'}</p><p className="mt-1.5 text-xs leading-5 text-[#AEB6C8]">{booking.exactPickupAddress}</p></div> : null}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-white/4 p-2"><p className="text-[9px] text-[#8891A6]">{hi ? 'कुल' : 'Total'}</p><p className="mt-1 font-bold text-[#F6F1E8]">₹{booking.total.toLocaleString('en-IN')}</p></div><div className="rounded-xl bg-white/4 p-2"><p className="text-[9px] text-[#8891A6]">{hi ? 'भुगतान' : 'Paid'}</p><p className="mt-1 font-bold text-[#63C7BA]">₹{booking.deposit.toLocaleString('en-IN')}</p></div><div className="rounded-xl bg-white/4 p-2"><p className="text-[9px] text-[#8891A6]">{hi ? 'बाकी' : 'Balance'}</p><p className="mt-1 font-bold text-[#F7D88C]">₹{booking.balance.toLocaleString('en-IN')}</p></div></div>
                  <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={booking.addedToItinerary} onClick={() => { addMarketplaceReservationToItinerary(booking); setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, addedToItinerary: true } : item)) }} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#D6A84B] px-2 text-[11px] font-black text-[#171004] disabled:opacity-60"><CheckCircle2 className="h-3.5 w-3.5" />{booking.addedToItinerary ? (hi ? 'योजना में' : 'In itinerary') : (hi ? 'योजना में जोड़ें' : 'Add to plan')}</button><button type="button" disabled={!canCancel || busyId === booking.id} onClick={() => void cancel(booking)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-2 text-[11px] font-bold text-[#AEB6C8] disabled:opacity-40">{busyId === booking.id ? <Spinner className="size-4" /> : <RotateCcw className="h-3.5 w-3.5" />}{hi ? 'रद्द करें' : 'Cancel'}</button></div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="app-card mt-6 rounded-[24px] p-8 text-center"><Store className="mx-auto h-8 w-8 text-[#8891A6]" /><h2 className="mt-3 font-bold text-[#F6F1E8]">{hi ? 'अभी कोई बुकिंग नहीं' : 'No art bookings yet'}</h2><p className="mt-2 text-xs leading-5 text-[#8891A6]">{hi ? 'स्थानीय हस्तशिल्प या कार्यशाला आरक्षित करें और वह यहाँ दिखाई देगी।' : 'Reserve a local craft or workshop and it will appear here.'}</p><Link href="/marketplace" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#D6A84B] px-4 py-3 text-xs font-black text-[#171004]"><PackageCheck className="h-4 w-4" />{hi ? 'स्थानीय कला खोजें' : 'Explore local art'}</Link></div>
        )}
      </div>
    </AppShell>
  )
}
