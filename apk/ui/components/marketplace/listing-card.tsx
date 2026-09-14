'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheck, CalendarClock, MapPin, PackageCheck, UsersRound } from 'lucide-react'
import { useLang } from '@/lib/languageContext'
import type { MarketplaceListing } from '@/lib/marketplace/types'

export function MarketplaceListingCard({ listing }: { listing: MarketplaceListing }) {
  const { lang } = useLang()
  const hi = lang === 'hi'
  const available = listing.kind === 'craft'
    ? (listing.stockQuantity ?? 0) > 0
    : listing.slots.some((slot) => slot.reservedQuantity + slot.heldQuantity < slot.capacity)

  return (
    <article className="app-card overflow-hidden rounded-[24px]">
      <Link href={`/marketplace/detail/?id=${encodeURIComponent(listing.id)}`} className="block">
        <div className="relative h-44 bg-[#171F34]">
          <Image src={listing.imageUrl} alt={listing.imageAlt} fill sizes="(max-width: 420px) 100vw, 420px" className="object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#080D1D]/90 to-transparent" />
          <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-[#080D1D]/80 px-3 py-1.5 text-[10px] font-bold text-[#F6F1E8] backdrop-blur">
            {listing.kind === 'craft' ? (hi ? 'हस्तशिल्प पिकअप' : 'Craft pickup') : (hi ? 'कार्यशाला' : 'Workshop')}
          </span>
          <span className="absolute bottom-3 right-3 rounded-full bg-[#63C7BA] px-2.5 py-1 text-[10px] font-black text-[#071B19]">
            {listing.distanceKm.toFixed(1)} km
          </span>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D6A84B]">{listing.craftType}</p>
              <h2 className="mt-1 font-heritage text-lg font-bold leading-6 text-[#F6F1E8]">{hi ? listing.titleHi : listing.title}</h2>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-black text-[#F7D88C]">₹{listing.price.toLocaleString('en-IN')}</p>
              <p className="text-[9px] text-[#8891A6]">{listing.kind === 'workshop' ? (hi ? 'प्रति व्यक्ति' : 'per person') : (hi ? 'प्रति वस्तु' : 'per item')}</p>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#AEB6C8]">{hi ? listing.descriptionHi : listing.description}</p>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/7 pt-3">
            <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-[#D9C7AA]">
              <BadgeCheck className="h-4 w-4 shrink-0 text-[#63C7BA]" />
              <span className="truncate">{listing.artisan.name}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-[10px] text-[#8891A6]">
              {listing.kind === 'craft' ? <PackageCheck className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
              {available ? (hi ? 'उपलब्ध' : 'Available') : (hi ? 'पूर्ण' : 'Full')}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-[#8891A6]">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {hi ? listing.siteNameHi : listing.siteName}</span>
            {listing.kind === 'workshop' && <span className="flex items-center gap-1"><UsersRound className="h-3 w-3" /> {listing.slots.length} {hi ? 'समय' : 'slots'}</span>}
          </div>
        </div>
      </Link>
    </article>
  )
}
