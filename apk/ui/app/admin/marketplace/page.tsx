'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BadgeCheck, CirclePause, ClipboardCheck, PackageCheck, RotateCcw, ShieldCheck, Store, UserCheck, XCircle } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Spinner } from '@/components/ui/spinner'
import { useLang } from '@/lib/languageContext'
import { adminCancelMarketplaceReservation, loadMarketplaceModeration, moderateArtisanListing, reviewArtisanApplication } from '@/lib/marketplace/artisan-client'

type Row = Record<string, unknown>

const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback
const idOf = (row: Row) => String(row.id ?? '')
const statusOf = (row: Row) => text(row.status ?? row.approval_status, 'pending')
const priceOf = (row: Row) => typeof row.price === 'number' ? row.price : Number(row.price_paise ?? 0) / 100
const listText = (value: unknown) => Array.isArray(value) ? value.map(String).join(', ') : ''
const rows = (value: unknown): Row[] => Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object') : []
const translatedText = (row: Row, field: 'title_translations' | 'description_translations', language: 'en' | 'hi', fallback: string) => {
  const translations = row[field]
  return translations && typeof translations === 'object' ? text((translations as Row)[language], fallback) : fallback
}

export default function MarketplaceAdminPage() {
  const { lang } = useLang()
  const hi = lang === 'hi'
  const [applications, setApplications] = useState<Row[]>([])
  const [listings, setListings] = useState<Row[]>([])
  const [reservations, setReservations] = useState<Row[]>([])
  const [demo, setDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const result = await loadMarketplaceModeration()
      setApplications(result.applications as Row[])
      setListings(result.listings as Row[])
      setReservations(result.reservations as Row[])
      setDemo(result.demo); setError('')
    } catch {
      setError(hi ? 'आपके खाते को बाज़ार एडमिन अनुमति नहीं है।' : 'This account does not have marketplace admin access.')
    } finally { setLoading(false) }
  }, [hi])

  useEffect(() => { void refresh() }, [refresh])

  const reviewApplication = async (id: string, status: 'approved' | 'rejected') => {
    setBusy(`app-${id}`)
    try { await reviewArtisanApplication(id, status, status === 'approved' ? 'Identity and local craft connection verified.' : 'Please provide clearer verification documents.', demo); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Review failed.') }
    finally { setBusy('') }
  }

  const reviewListing = async (id: string, status: 'approved' | 'paused') => {
    const listing = listings.find((item) => idOf(item) === id)
    let review: { depositPercent: number; titleEn: string; titleHi: string; descriptionEn: string; descriptionHi: string } | undefined
    if (status === 'approved' && listing && !demo) {
      const depositValue = window.prompt('Advance payment percentage (1–100)', String(listing.deposit_percent ?? 20))
      if (depositValue === null) return
      const depositPercent = Number(depositValue)
      if (!Number.isInteger(depositPercent) || depositPercent < 1 || depositPercent > 100) {
        setError('Deposit percentage must be a whole number from 1 to 100.'); return
      }
      const sourceTitle = text(listing.title_source, 'Untitled listing')
      const sourceDescription = text(listing.description_source)
      const titleEn = window.prompt('Correct English title', translatedText(listing, 'title_translations', 'en', sourceTitle))
      if (titleEn === null) return
      const titleHi = window.prompt('Correct Hindi title', translatedText(listing, 'title_translations', 'hi', sourceTitle))
      if (titleHi === null) return
      const descriptionEn = window.prompt('Correct English description', translatedText(listing, 'description_translations', 'en', sourceDescription))
      if (descriptionEn === null) return
      const descriptionHi = window.prompt('Correct Hindi description', translatedText(listing, 'description_translations', 'hi', sourceDescription))
      if (descriptionHi === null) return
      review = { depositPercent, titleEn, titleHi, descriptionEn, descriptionHi }
    }
    setBusy(`listing-${id}`)
    try { await moderateArtisanListing(id, status, status === 'approved' ? 'Content and translations reviewed.' : 'Paused by marketplace moderation.', demo, review); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Moderation failed.') }
    finally { setBusy('') }
  }

  const refund = async (id: string) => {
    setBusy(`reservation-${id}`)
    try { await adminCancelMarketplaceReservation(id, demo); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Refund failed.') }
    finally { setBusy('') }
  }

  return (
    <AppShell>
      <div className="screen-gutter py-5">
        <Link href="/artisan" className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-[#AEB6C8]"><ArrowLeft className="h-4 w-4" /> {hi ? 'कारीगर पोर्टल' : 'Artisan portal'}</Link>
        <header className="mt-2"><p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#63C7BA]"><ShieldCheck className="h-4 w-4" />{hi ? 'सुरक्षित संचालन' : 'Trust operations'}</p><h1 className="mt-1 font-heritage text-[28px] font-bold text-[#F6F1E8]">{hi ? 'बाज़ार एडमिन' : 'Marketplace admin'}</h1><p className="mt-1 text-sm text-[#AEB6C8]">{hi ? 'कारीगर, लिस्टिंग, अनुवाद और रिफंड की समीक्षा करें।' : 'Review artisans, listings, translations, cancellations, and refunds.'}</p></header>
        {demo ? <p className="mt-4 rounded-xl border border-[#D6A84B]/20 bg-[#D6A84B]/[0.06] p-3 text-[11px] leading-5 text-[#F3DFC0]">{hi ? 'स्थानीय पायलट एडमिन: लाइव रिलीज़ में यह स्क्रीन केवल सुरक्षित एडमिन सूची के सदस्यों को दिखाई देगी।' : 'Local pilot admin: in the live release this screen is visible only to members of the protected admin table.'}</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-200">{error}</p> : null}
        {loading ? <div className="grid min-h-64 place-items-center"><Spinner className="size-9 text-[#D6A84B]" /></div> : !error || demo ? (
          <div className="mt-5 space-y-5">
            <AdminSection title={hi ? 'कारीगर आवेदन' : 'Artisan applications'} icon={<UserCheck className="h-5 w-5 text-[#63C7BA]" />} count={applications.length}>
              {applications.length ? applications.map((application) => {
                const id = idOf(application)
                const pending = statusOf(application) === 'pending'
                return <div key={id} className="rounded-xl border border-white/8 p-3"><div className="flex justify-between gap-3"><div><p className="font-bold text-[#F6F1E8]">{text(application.displayName ?? application.display_name, 'Artisan')}</p><p className="mt-1 text-[10px] text-[#8891A6]">{text(application.city)} · {listText(application.craftTraditions ?? application.craft_traditions)}</p></div><span className="h-fit rounded-full bg-white/6 px-2 py-1 text-[9px] font-black uppercase text-[#AEB6C8]">{statusOf(application)}</span></div><p className="mt-2 line-clamp-3 text-xs leading-5 text-[#AEB6C8]">{text(application.story)}</p>{rows(application.artisan_documents).length ? <div className="mt-2 flex flex-wrap gap-2">{rows(application.artisan_documents).map((document) => <a key={idOf(document)} href={text(document.signed_url)} target="_blank" rel="noreferrer" className="rounded-lg border border-[#63C7BA]/20 px-2.5 py-1.5 text-[10px] font-bold text-[#63C7BA]">{hi ? 'दस्तावेज़ देखें' : 'Review'} {text(document.document_type, 'document').replace('_', ' ')}</a>)}</div> : null}{pending ? <div className="mt-3 grid grid-cols-2 gap-2"><button disabled={busy === `app-${id}`} onClick={() => void reviewApplication(id, 'approved')} className="flex min-h-10 items-center justify-center gap-1 rounded-xl bg-[#63C7BA] text-xs font-black text-[#071B19]"><BadgeCheck className="h-4 w-4" />{hi ? 'स्वीकृत' : 'Approve'}</button><button disabled={busy === `app-${id}`} onClick={() => void reviewApplication(id, 'rejected')} className="flex min-h-10 items-center justify-center gap-1 rounded-xl border border-red-400/20 text-xs font-bold text-red-200"><XCircle className="h-4 w-4" />{hi ? 'अस्वीकृत' : 'Reject'}</button></div> : null}</div>
              }) : <Empty text={hi ? 'कोई आवेदन नहीं' : 'No applications to review'} />}
            </AdminSection>

            <AdminSection title={hi ? 'लिस्टिंग और अनुवाद' : 'Listings & translations'} icon={<ClipboardCheck className="h-5 w-5 text-[#D6A84B]" />} count={listings.length}>
              {listings.length ? listings.map((listing) => { const id = idOf(listing); const approved = statusOf(listing) === 'approved'; return <div key={id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 p-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-[#F6F1E8]">{text(listing.title ?? listing.title_source, 'Untitled listing')}</p><p className="mt-1 text-[10px] text-[#8891A6]">{text(listing.kind)} · ₹{priceOf(listing).toLocaleString('en-IN')} · {statusOf(listing)}</p></div><button disabled={busy === `listing-${id}`} onClick={() => void reviewListing(id, approved ? 'paused' : 'approved')} className={`flex min-h-10 shrink-0 items-center gap-1 rounded-xl px-3 text-[10px] font-black ${approved ? 'border border-white/10 text-[#AEB6C8]' : 'bg-[#D6A84B] text-[#171004]'}`}>{approved ? <CirclePause className="h-3.5 w-3.5" /> : <PackageCheck className="h-3.5 w-3.5" />}{approved ? (hi ? 'रोकें' : 'Pause') : (hi ? 'प्रकाशित' : 'Publish')}</button></div> }) : <Empty text={hi ? 'कोई लिस्टिंग नहीं' : 'No listings to moderate'} />}
            </AdminSection>

            <AdminSection title={hi ? 'बुकिंग और रिफंड' : 'Bookings & refunds'} icon={<RotateCcw className="h-5 w-5 text-purple-300" />} count={reservations.length}>
              {reservations.length ? reservations.map((reservation) => { const id = idOf(reservation); const status = statusOf(reservation); const actionable = ['confirmed', 'payment_pending'].includes(status); const title = text(reservation.listingTitle) || text((reservation.marketplace_listings as Row | undefined)?.title_source, 'Marketplace reservation'); return <div key={id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 p-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-[#F6F1E8]">{title}</p><p className="mt-1 text-[10px] text-[#8891A6]">{id} · {status}</p></div><button disabled={!actionable || busy === `reservation-${id}`} onClick={() => void refund(id)} className="flex min-h-10 shrink-0 items-center gap-1 rounded-xl border border-purple-300/20 px-3 text-[10px] font-black text-purple-200 disabled:opacity-35"><RotateCcw className="h-3.5 w-3.5" />{hi ? 'रद्द/रिफंड' : 'Cancel/refund'}</button></div> }) : <Empty text={hi ? 'कोई बुकिंग नहीं' : 'No bookings yet'} />}
            </AdminSection>
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}

function AdminSection({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return <section className="app-card rounded-[24px] p-4"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold text-[#F6F1E8]">{icon}{title}</h2><span className="rounded-full bg-white/7 px-2.5 py-1 text-[10px] font-black text-[#AEB6C8]">{count}</span></div><div className="space-y-2">{children}</div></section>
}

function Empty({ text: value }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-white/10 p-5 text-center"><Store className="mx-auto h-5 w-5 text-[#667086]" /><p className="mt-2 text-xs text-[#8891A6]">{value}</p></div>
}
