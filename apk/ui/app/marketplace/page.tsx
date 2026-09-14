'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Brush, CalendarCheck2, ChevronRight, Filter, Search, ShieldCheck, Store, X } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { MarketplaceListingCard } from '@/components/marketplace/listing-card'
import { TravelTabs } from '@/components/marketplace/travel-tabs'
import { Spinner } from '@/components/ui/spinner'
import { useLang } from '@/lib/languageContext'
import { loadMarketplaceListings } from '@/lib/marketplace/client'
import type { MarketplaceFilters, MarketplaceListing } from '@/lib/marketplace/types'

const initialFilters: MarketplaceFilters = {
  query: '', siteId: 'all', kind: 'all', craftType: 'all', maxPrice: null,
  maxDistance: null, language: 'all', availableOnly: true,
}

export default function MarketplacePage() {
  const { lang } = useLang()
  const hi = lang === 'hi'
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [filters, setFilters] = useState(initialFilters)
  const deferredQuery = useDeferredValue(filters.query)
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let active = true
    void loadMarketplaceListings().then((result) => {
      if (!active) return
      setListings(result.listings)
      setDemo(result.demo)
      const requestedSite = new URLSearchParams(window.location.search).get('site')
      if (requestedSite && result.listings.some((item) => item.siteId === requestedSite)) {
        setFilters((current) => ({ ...current, siteId: requestedSite }))
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const sites = useMemo(() => Array.from(new Map(listings.map((item) => [item.siteId, hi ? item.siteNameHi : item.siteName])).entries()), [hi, listings])
  const craftTypes = useMemo(() => Array.from(new Set(listings.map((item) => item.craftType))).sort(), [listings])
  const filtered = useMemo(() => {
    const query = deferredQuery.trim().toLowerCase()
    return listings.filter((listing) => {
      const availability = listing.kind === 'craft'
        ? (listing.stockQuantity ?? 0) > 0
        : listing.slots.some((slot) => slot.capacity > slot.reservedQuantity + slot.heldQuantity)
      return (!query || `${listing.title} ${listing.titleHi} ${listing.artisan.name} ${listing.craftType} ${listing.city}`.toLowerCase().includes(query))
        && (filters.siteId === 'all' || listing.siteId === filters.siteId)
        && (filters.kind === 'all' || listing.kind === filters.kind)
        && (filters.craftType === 'all' || listing.craftType === filters.craftType)
        && (filters.maxPrice === null || listing.price <= filters.maxPrice)
        && (filters.maxDistance === null || listing.distanceKm <= filters.maxDistance)
        && (filters.language === 'all' || listing.artisan.languages.some((item) => item.toLowerCase().startsWith(filters.language)))
        && (!filters.availableOnly || availability)
    })
  }, [deferredQuery, filters, listings])

  const updateFilter = <Key extends keyof MarketplaceFilters>(key: Key, value: MarketplaceFilters[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <AppShell>
      <div className="screen-gutter py-5">
        <header>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#D6A84B]"><Brush className="h-4 w-4" /> {hi ? 'जीवित विरासत' : 'Living heritage'}</p>
              <h1 className="mt-1 font-heritage text-[28px] font-bold leading-9 text-[#F6F1E8]">{hi ? 'स्थानीय कला बाज़ार' : 'Local Art Marketplace'}</h1>
              <p className="mt-1 text-sm leading-5 text-[#AEB6C8]">{hi ? 'स्मारक के आसपास सत्यापित कारीगरों से मिलें और उनकी कला पहले से आरक्षित करें।' : 'Meet verified makers near each monument and reserve their craft before you arrive.'}</p>
            </div>
            <Link href="/marketplace/bookings" aria-label={hi ? 'मेरी बुकिंग' : 'My bookings'} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#D6A84B]/25 bg-[#D6A84B]/10 text-[#F7D88C]"><CalendarCheck2 className="h-5 w-5" /></Link>
          </div>
          <div className="mt-4"><TravelTabs active="marketplace" /></div>
        </header>

        {demo && (
          <div className="mt-4 flex gap-2 rounded-xl border border-[#63C7BA]/20 bg-[#63C7BA]/[0.07] p-3 text-[11px] leading-5 text-[#A9E5DB]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{hi ? 'सुरक्षित पायलट मोड: भुगतान परीक्षण है; आपके कार्ड से वास्तविक राशि नहीं ली जाएगी।' : 'Safe pilot mode: checkout is a test reservation and no real charge is made.'}</span>
          </div>
        )}

        <section className="mt-4" aria-label={hi ? 'बाज़ार फ़िल्टर' : 'Marketplace filters'}>
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">{hi ? 'कला खोजें' : 'Search local art'}</span>
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-[#8891A6]" />
              <input value={filters.query} onChange={(event) => updateFilter('query', event.target.value)} placeholder={hi ? 'कला, कारीगर या शहर खोजें' : 'Search craft, artisan, or city'} className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-10 text-sm text-[#F6F1E8] outline-none placeholder:text-[#7A6E5C] focus:border-[#D6A84B]/45" />
              {filters.query ? <button type="button" onClick={() => updateFilter('query', '')} aria-label={hi ? 'खोज साफ़ करें' : 'Clear search'} className="absolute right-2 top-2 grid h-9 w-9 place-items-center text-[#8891A6]"><X className="h-4 w-4" /></button> : null}
            </label>
            <button type="button" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-[#D6A84B]"><Filter className="h-4 w-4" /></button>
          </div>

          <div className="app-scroll-row mt-3 flex gap-2 overflow-x-auto pb-1">
            {[['all', hi ? 'सभी' : 'All'], ...sites].map(([id, name]) => (
              <button key={id} type="button" onClick={() => updateFilter('siteId', id)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold ${filters.siteId === id ? 'border-[#D6A84B]/50 bg-[#D6A84B]/15 text-[#F7D88C]' : 'border-white/8 bg-white/4 text-[#8891A6]'}`}>{name}</button>
            ))}
          </div>

          {showFilters ? (
            <div className="app-card mt-3 grid grid-cols-2 gap-3 rounded-2xl p-4">
              <label className="text-xs font-semibold text-[#AEB6C8]">{hi ? 'प्रकार' : 'Offering'}
                <select value={filters.kind} onChange={(event) => updateFilter('kind', event.target.value as MarketplaceFilters['kind'])} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#171F34] p-3 text-sm text-[#F6F1E8]"><option value="all">{hi ? 'सभी' : 'All'}</option><option value="craft">{hi ? 'हस्तशिल्प' : 'Craft pickup'}</option><option value="workshop">{hi ? 'कार्यशाला' : 'Workshop'}</option></select>
              </label>
              <label className="text-xs font-semibold text-[#AEB6C8]">{hi ? 'कला रूप' : 'Craft form'}
                <select value={filters.craftType} onChange={(event) => updateFilter('craftType', event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#171F34] p-3 text-sm text-[#F6F1E8]"><option value="all">{hi ? 'सभी' : 'All'}</option>{craftTypes.map((item) => <option key={item}>{item}</option>)}</select>
              </label>
              <label className="text-xs font-semibold text-[#AEB6C8]">{hi ? 'अधिकतम कीमत' : 'Max price'}
                <select value={filters.maxPrice ?? ''} onChange={(event) => updateFilter('maxPrice', event.target.value ? Number(event.target.value) : null)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#171F34] p-3 text-sm text-[#F6F1E8]"><option value="">{hi ? 'कोई सीमा नहीं' : 'Any price'}</option><option value="1000">₹1,000</option><option value="2000">₹2,000</option><option value="3000">₹3,000</option></select>
              </label>
              <label className="text-xs font-semibold text-[#AEB6C8]">{hi ? 'दूरी' : 'Distance'}
                <select value={filters.maxDistance ?? ''} onChange={(event) => updateFilter('maxDistance', event.target.value ? Number(event.target.value) : null)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#171F34] p-3 text-sm text-[#F6F1E8]"><option value="">{hi ? 'कोई सीमा नहीं' : 'Any distance'}</option><option value="2">2 km</option><option value="5">5 km</option></select>
              </label>
              <label className="text-xs font-semibold text-[#AEB6C8]">{hi ? 'कारीगर की भाषा' : 'Artisan language'}
                <select value={filters.language} onChange={(event) => updateFilter('language', event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#171F34] p-3 text-sm text-[#F6F1E8]"><option value="all">{hi ? 'सभी भाषाएं' : 'Any language'}</option><option value="hindi">Hindi</option><option value="english">English</option><option value="urdu">Urdu</option><option value="kannada">Kannada</option><option value="rajasthani">Rajasthani</option></select>
              </label>
              <label className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 p-3 text-xs font-semibold text-[#D9C7AA]">{hi ? 'केवल उपलब्ध' : 'Available now only'}<input type="checkbox" checked={filters.availableOnly} onChange={(event) => updateFilter('availableOnly', event.target.checked)} className="h-4 w-4 accent-[#D6A84B]" /></label>
            </div>
          ) : null}
        </section>

        <div className="mt-5 flex items-center justify-between"><p className="text-xs font-semibold text-[#AEB6C8]">{hi ? `${filtered.length} स्थानीय अनुभव` : `${filtered.length} local experiences`}</p><span className="flex items-center gap-1 text-[10px] text-[#63C7BA]"><ShieldCheck className="h-3.5 w-3.5" /> {hi ? 'सत्यापित कारीगर' : 'Verified artisans'}</span></div>
        {loading ? <div className="grid min-h-64 place-items-center"><Spinner className="size-8 text-[#D6A84B]" /></div> : (
          <div className="mt-3 space-y-4">
            {filtered.map((listing) => <MarketplaceListingCard key={listing.id} listing={listing} />)}
            {!filtered.length ? <div className="app-card rounded-2xl p-8 text-center"><Search className="mx-auto h-6 w-6 text-[#8891A6]" /><p className="mt-3 font-bold text-[#F6F1E8]">{hi ? 'कोई कला नहीं मिली' : 'No local art found'}</p><button type="button" onClick={() => setFilters(initialFilters)} className="mt-2 text-sm font-bold text-[#D6A84B]">{hi ? 'फ़िल्टर साफ़ करें' : 'Clear filters'}</button></div> : null}
          </div>
        )}

        <Link href="/artisan" className="mt-5 flex items-center gap-3 rounded-2xl border border-[#D6A84B]/22 bg-[#D6A84B]/[0.07] p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#D6A84B]/14 text-[#D6A84B]"><Store className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[#F6F1E8]">{hi ? 'क्या आप स्थानीय कारीगर हैं?' : 'Are you a local artisan?'}</span><span className="mt-0.5 block text-xs text-[#AEB6C8]">{hi ? 'सत्यापन के लिए आवेदन करें और अपनी कला सूचीबद्ध करें।' : 'Apply for verification and list your work.'}</span></span>
          <ChevronRight className="h-5 w-5 text-[#D6A84B]" />
        </Link>
      </div>
    </AppShell>
  )
}
