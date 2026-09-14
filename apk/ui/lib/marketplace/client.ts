'use client'

import { isBundledAndroidApp, supabase } from '@/lib/supabase/client'
import { isLocalUserId } from '@/lib/localSession'
import { isSupportedLanguage } from '@/lib/languages'
import { getDemoMarketplaceListings } from '@/lib/marketplace/demo-data'
import {
  addReservationToLocalItinerary,
  getLocalReservations,
  saveLocalReservation,
  updateLocalReservation,
} from '@/lib/marketplace/local-store'
import type { MarketplaceListing, MarketplaceReservation, WorkshopSlot } from '@/lib/marketplace/types'

type DbRecord = Record<string, unknown>

function asObject(value: unknown): DbRecord {
  return value && typeof value === 'object' ? value as DbRecord : {}
}

function asArray(value: unknown): DbRecord[] {
  return Array.isArray(value) ? value.map(asObject) : []
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function number(value: unknown, fallback = 0) {
  return typeof value === 'number' ? value : Number(value) || fallback
}

function isCloudListingId(id: string) {
  return /^\d+$/.test(id) && Number.isSafeInteger(Number(id))
}

function mapCloudListing(row: DbRecord): MarketplaceListing {
  const artisanAccount = asObject(Array.isArray(row.artisan_accounts) ? row.artisan_accounts[0] : row.artisan_accounts)
  const artisanProfile = asObject(Array.isArray(artisanAccount.artisan_profiles) ? artisanAccount.artisan_profiles[0] : artisanAccount.artisan_profiles)
  const site = asObject(row.heritage_sites)
  const media = asArray(row.listing_media).sort((a, b) => number(a.sort_order) - number(b.sort_order))[0]
  const slots: WorkshopSlot[] = asArray(row.workshop_slots).map((slot) => ({
    id: String(slot.id), startsAt: text(slot.starts_at), endsAt: text(slot.ends_at),
    capacity: number(slot.capacity), reservedQuantity: number(slot.reserved_quantity), heldQuantity: number(slot.held_quantity),
  }))
  const titles = asObject(row.title_translations)
  const descriptions = asObject(row.description_translations)
  const imagePath = text(media?.storage_path)
  const imageUrl = imagePath
    ? supabase.storage.from('marketplace-listings').getPublicUrl(imagePath).data.publicUrl
    : '/hero-monuments.png'
  const sourceLanguage = text(row.source_language)
  return {
    id: String(row.id), kind: text(row.kind) === 'workshop' ? 'workshop' : 'craft',
    siteId: text(row.site_id), siteName: text(site.name), siteNameHi: text(site.name_hi, text(site.name)),
    city: text(site.city), state: text(site.state), craftType: text(row.craft_type), sourceLanguage: isSupportedLanguage(sourceLanguage) ? sourceLanguage : 'en',
    title: text(titles.en, text(row.title_source)), titleHi: text(titles.hi, text(row.title_source)),
    description: text(descriptions.en, text(row.description_source)), descriptionHi: text(descriptions.hi, text(row.description_source)),
    price: number(row.price_paise) / 100, depositPercent: number(row.deposit_percent, 20),
    stockQuantity: row.stock_quantity === null ? null : number(row.stock_quantity), distanceKm: number(row.distance_km),
    approximatePickupArea: text(row.approximate_pickup_area), imageUrl, imageAlt: text(media?.alt_text_source, text(row.title_source)),
    active: row.active !== false, slots,
    artisan: {
      id: text(row.artisan_id), name: text(artisanProfile.display_name, 'Local artisan'),
      story: text(artisanProfile.story_source), verified: text(artisanAccount.approval_status) === 'approved',
      craftTraditions: Array.isArray(artisanProfile.craft_traditions) ? artisanProfile.craft_traditions.map(String) : [],
      languages: Array.isArray(artisanProfile.languages) ? artisanProfile.languages.map(String) : [],
      city: text(artisanProfile.city, text(site.city)),
    },
  }
}

export async function loadMarketplaceListings(): Promise<{ listings: MarketplaceListing[]; demo: boolean }> {
  if (isBundledAndroidApp()) return { listings: getDemoMarketplaceListings(), demo: true }
  try {
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select('*, heritage_sites(*), artisan_accounts!marketplace_listings_artisan_id_fkey(*, artisan_profiles(*)), listing_media(*), workshop_slots(*)')
      .eq('approval_status', 'approved')
      .eq('active', true)
    if (error || !data?.length) throw error ?? new Error('No live listings')
    return { listings: (data as DbRecord[]).map(mapCloudListing), demo: false }
  } catch {
    return { listings: getDemoMarketplaceListings(), demo: true }
  }
}

export async function loadMarketplaceListing(id: string) {
  const { listings, demo } = await loadMarketplaceListings()
  return { listing: listings.find((item) => item.id === id) ?? null, demo }
}

function randomDigits() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
}

function createLocalReservation(listing: MarketplaceListing, quantity: number, scheduledFor: string): MarketplaceReservation {
  const total = listing.price * quantity
  const deposit = Math.ceil(total * listing.depositPercent / 100)
  const reservation: MarketplaceReservation = {
    id: `SA-ART-${Date.now().toString(36).toUpperCase()}`,
    listingId: listing.id, listingTitle: listing.title, listingKind: listing.kind,
    artisanName: listing.artisan.name, siteName: listing.siteName, quantity, total, deposit,
    balance: total - deposit, scheduledFor, status: 'confirmed', confirmationPin: randomDigits(),
    qrToken: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    exactPickupAddress: `${listing.approximatePickupArea}, ${listing.city} — exact studio directions are shared in this confirmed reservation.`,
    pickupInstructions: 'Show the confirmation PIN or QR code to the artisan. Pay the remaining balance directly after pickup or attendance.',
    createdAt: new Date().toISOString(), addedToItinerary: false, testMode: true,
  }
  saveLocalReservation(reservation)
  return reservation
}

interface RazorpayResult { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
interface RazorpayOptions {
  key: string; amount: number; currency: string; name: string; description: string; order_id: string;
  handler: (result: RazorpayResult) => void; modal: { ondismiss: () => void }; theme: { color: string }
}

declare global {
  interface Window { Razorpay?: new (options: RazorpayOptions) => { open: () => void } }
}

async function loadRazorpayCheckout() {
  if (window.Razorpay) return
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Payment checkout could not load.'))
    document.head.appendChild(script)
  })
}

export async function reserveMarketplaceListing(args: {
  userId: string
  listing: MarketplaceListing
  quantity: number
  slotId?: string
  scheduledFor: string
}): Promise<MarketplaceReservation> {
  if (isBundledAndroidApp() || isLocalUserId(args.userId) || !isCloudListingId(args.listing.id)) {
    return createLocalReservation(args.listing, args.quantity, args.scheduledFor)
  }

  const { data: reserveData, error: reserveError } = await supabase.functions.invoke('create-marketplace-reservation', {
    body: { listingId: args.listing.id, quantity: args.quantity, workshopSlotId: args.slotId, scheduledFor: args.scheduledFor },
  })
  if (reserveError) throw reserveError
  const reservationId = text(asObject(reserveData).reservationId)
  const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', { body: { reservationId } })
  if (orderError) throw orderError
  const order = asObject(orderData)
  await loadRazorpayCheckout()
  if (!window.Razorpay) throw new Error('Payment checkout is unavailable.')

  await new Promise<void>((resolve, reject) => {
    const checkout = new window.Razorpay!({
      key: text(order.keyId), amount: number(order.amount), currency: 'INR', name: 'Sanskriti AI',
      description: `Advance for ${args.listing.title}`, order_id: text(order.orderId),
      theme: { color: '#D6A84B' }, modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) },
      handler: async (result) => {
        const { error } = await supabase.functions.invoke('verify-razorpay-payment', {
          body: { reservationId, orderId: result.razorpay_order_id, paymentId: result.razorpay_payment_id, signature: result.razorpay_signature },
        })
        if (error) reject(error); else resolve()
      },
    })
    checkout.open()
  })

  const { data, error } = await supabase.from('marketplace_reservations')
    .select('*, marketplace_listings(listing_fulfillment_details(*))').eq('id', reservationId).single()
  if (error) throw error
  const row = asObject(data)
  const paidListing = asObject(row.marketplace_listings)
  const fulfillment = asObject(Array.isArray(paidListing.listing_fulfillment_details)
    ? paidListing.listing_fulfillment_details[0]
    : paidListing.listing_fulfillment_details)
  return {
    id: reservationId, listingId: args.listing.id, listingTitle: args.listing.title, listingKind: args.listing.kind,
    artisanName: args.listing.artisan.name, siteName: args.listing.siteName, quantity: number(row.quantity),
    total: number(row.total_price_paise) / 100, deposit: number(row.deposit_paise) / 100,
    balance: number(row.balance_paise) / 100, scheduledFor: text(row.scheduled_for), status: 'confirmed',
    confirmationPin: text(row.confirmation_pin), qrToken: text(row.qr_token),
    exactPickupAddress: text(fulfillment.exact_pickup_address, args.listing.approximatePickupArea),
    pickupInstructions: text(fulfillment.pickup_instructions, 'Show the confirmation PIN or QR code to the artisan.'), createdAt: text(row.created_at),
    addedToItinerary: false, testMode: false,
  }
}

export async function loadMyMarketplaceReservations(userId?: string): Promise<MarketplaceReservation[]> {
  if (!userId || isBundledAndroidApp() || isLocalUserId(userId)) return getLocalReservations()
  const { data, error } = await supabase.from('marketplace_reservations').select('*, marketplace_listings(*, artisan_accounts!marketplace_listings_artisan_id_fkey(*, artisan_profiles(*)), listing_fulfillment_details(*), heritage_sites(*))').order('created_at', { ascending: false })
  if (error) return getLocalReservations()
  const cloudReservations: MarketplaceReservation[] = (data as DbRecord[]).map((row) => {
    const listing = asObject(row.marketplace_listings)
    const account = asObject(Array.isArray(listing.artisan_accounts) ? listing.artisan_accounts[0] : listing.artisan_accounts)
    const artisan = asObject(Array.isArray(account.artisan_profiles) ? account.artisan_profiles[0] : account.artisan_profiles)
    const site = asObject(listing.heritage_sites)
    const details = asObject(Array.isArray(listing.listing_fulfillment_details) ? listing.listing_fulfillment_details[0] : listing.listing_fulfillment_details)
    return {
      id: text(row.id), listingId: String(row.listing_id), listingTitle: text(listing.title_source),
      listingKind: text(listing.kind) === 'workshop' ? 'workshop' : 'craft', artisanName: text(artisan.display_name),
      siteName: text(site.name), quantity: number(row.quantity), total: number(row.total_price_paise) / 100,
      deposit: number(row.deposit_paise) / 100, balance: number(row.balance_paise) / 100,
      scheduledFor: text(row.scheduled_for), status: text(row.status) as MarketplaceReservation['status'],
      confirmationPin: text(row.confirmation_pin), qrToken: text(row.qr_token), exactPickupAddress: text(details.exact_pickup_address),
      pickupInstructions: text(details.pickup_instructions), createdAt: text(row.created_at), addedToItinerary: false, testMode: false,
    }
  })
  return [...getLocalReservations(), ...cloudReservations]
}

export async function cancelMarketplaceReservation(userId: string, reservation: MarketplaceReservation) {
  if (isBundledAndroidApp() || isLocalUserId(userId) || reservation.testMode || !isCloudListingId(reservation.listingId)) {
    const refundable = new Date(reservation.scheduledFor).getTime() - Date.now() >= 24 * 60 * 60_000
    return updateLocalReservation(reservation.id, { status: refundable ? 'refunded' : 'cancelled' })
  }
  const { data, error } = await supabase.functions.invoke('cancel-marketplace-reservation', {
    body: { reservationId: reservation.id, reason: 'Cancelled by visitor' },
  })
  if (error) throw error
  return data
}

export function addMarketplaceReservationToItinerary(reservation: MarketplaceReservation) {
  saveLocalReservation({ ...reservation, addedToItinerary: true })
  addReservationToLocalItinerary(reservation.id)
}
