'use client'

import { isBundledAndroidApp, supabase } from '@/lib/supabase/client'
import { isLocalUserId } from '@/lib/localSession'
import {
  getLocalArtisanApplication,
  getLocalArtisanListings,
  getLocalReservations,
  reviewLocalArtisanApplication,
  reviewLocalArtisanListing,
  saveLocalArtisanApplication,
  saveLocalArtisanListing,
  updateLocalArtisanListing,
  updateLocalReservation,
  type LocalArtisanApplication,
  type LocalArtisanListing,
} from '@/lib/marketplace/local-store'

export interface ArtisanApplicationInput {
  legalName: string
  displayName: string
  phone: string
  city: string
  state: string
  pickupArea: string
  story: string
  craftTraditions: string[]
  languages: string[]
  siteIds: string[]
}

export interface ArtisanListingInput {
  title: string
  description: string
  kind: 'craft' | 'workshop'
  craftType: string
  siteId: string
  price: number
  stock: number | null
  pickupArea: string
  exactAddress: string
  contactPhone: string
  sourceLanguage: string
  images: File[]
  workshopStartsAt?: string
  workshopCapacity?: number
}

export interface ArtisanWorkspace {
  application: LocalArtisanApplication | null
  approved: boolean
  listings: LocalArtisanListing[]
  demo: boolean
}

const isLocal = (userId: string) => isBundledAndroidApp() || isLocalUserId(userId)

export async function loadArtisanWorkspace(userId: string): Promise<ArtisanWorkspace> {
  if (isLocal(userId)) {
    const application = getLocalArtisanApplication()
    return { application, approved: application?.status === 'approved', listings: getLocalArtisanListings(), demo: true }
  }
  const [applicationResult, accountResult, listingResult] = await Promise.all([
    supabase.from('artisan_applications').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('artisan_accounts').select('approval_status').eq('user_id', userId).maybeSingle(),
    supabase.from('marketplace_listings').select('*, workshop_slots(id, starts_at, capacity, reserved_quantity, held_quantity, active)').eq('artisan_id', userId).order('created_at', { ascending: false }),
  ])
  const row = applicationResult.data
  const application: LocalArtisanApplication | null = row ? {
    id: String(row.id), legalName: row.legal_name, displayName: row.display_name, phone: row.phone,
    city: row.city, state: row.state, pickupArea: row.approximate_pickup_area, story: row.story,
    craftTraditions: row.craft_traditions ?? [], languages: row.languages ?? [], siteIds: row.requested_site_ids ?? [],
    documentNames: [], status: row.status, adminNote: row.admin_note ?? '', submittedAt: row.submitted_at,
  } : null
  const listings: LocalArtisanListing[] = (listingResult.data ?? []).map((item) => {
    const slot = Array.isArray(item.workshop_slots) ? item.workshop_slots[0] : null
    return {
      id: String(item.id), title: item.title_source, kind: item.kind, craftType: item.craft_type,
      siteId: item.site_id, price: item.price_paise / 100, stock: item.stock_quantity,
      active: item.active, workshopCapacity: slot?.capacity, workshopReserved: slot?.reserved_quantity,
      workshopHeld: slot?.held_quantity, workshopStartsAt: slot?.starts_at,
      status: item.approval_status, createdAt: item.created_at,
    }
  })
  return { application, approved: accountResult.data?.approval_status === 'approved', listings, demo: false }
}

export async function submitArtisanApplication(userId: string, input: ArtisanApplicationInput, documents: File[]) {
  if (isLocal(userId)) {
    const application: LocalArtisanApplication = {
      id: `APP-${Date.now().toString(36).toUpperCase()}`, ...input,
      documentNames: documents.map((file) => file.name), status: 'pending', submittedAt: new Date().toISOString(),
    }
    saveLocalArtisanApplication(application)
    return application
  }
  const { data, error } = await supabase.from('artisan_applications').upsert({
    user_id: userId, legal_name: input.legalName, display_name: input.displayName, phone: input.phone,
    city: input.city, state: input.state, approximate_pickup_area: input.pickupArea, story: input.story,
    craft_traditions: input.craftTraditions, languages: input.languages, requested_site_ids: input.siteIds,
    status: 'pending', submitted_at: new Date().toISOString(),
  }, { onConflict: 'user_id' }).select('*').single()
  if (error) throw error
  for (const document of documents) {
    const safeName = document.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${userId}/${data.id}/${crypto.randomUUID()}-${safeName}`
    const upload = await supabase.storage.from('artisan-documents').upload(storagePath, document, { upsert: false })
    if (upload.error) throw upload.error
    const record = await supabase.from('artisan_documents').insert({ application_id: data.id, storage_path: storagePath, document_type: 'craft_proof' })
    if (record.error) throw record.error
  }
  return data
}

export async function createArtisanListing(userId: string, input: ArtisanListingInput) {
  if (isLocal(userId)) {
    const listing: LocalArtisanListing = {
      id: `LIST-${Date.now().toString(36).toUpperCase()}`, title: input.title, kind: input.kind,
      craftType: input.craftType, siteId: input.siteId, price: input.price,
      stock: input.kind === 'craft' ? input.stock : null, active: true,
      workshopCapacity: input.kind === 'workshop' ? input.workshopCapacity : undefined,
      workshopReserved: 0, workshopHeld: 0, workshopStartsAt: input.workshopStartsAt,
      status: 'pending', createdAt: new Date().toISOString(),
    }
    saveLocalArtisanListing(listing)
    return listing
  }
  const { data, error } = await supabase.from('marketplace_listings').insert({
    artisan_id: userId, site_id: input.siteId, kind: input.kind, craft_type: input.craftType,
    source_language: input.sourceLanguage, title_source: input.title, description_source: input.description,
    title_translations: { [input.sourceLanguage]: input.title }, description_translations: { [input.sourceLanguage]: input.description },
    price_paise: Math.round(input.price * 100), deposit_percent: 20,
    stock_quantity: input.kind === 'craft' ? input.stock : null,
    approximate_pickup_area: input.pickupArea, approval_status: 'pending',
  }).select('*').single()
  if (error) throw error
  const details = await supabase.from('listing_fulfillment_details').insert({ listing_id: data.id, exact_pickup_address: input.exactAddress, contact_phone: input.contactPhone })
  if (details.error) throw details.error
  if (input.kind === 'workshop' && input.workshopStartsAt) {
    const startsAt = new Date(input.workshopStartsAt)
    const slot = await supabase.from('workshop_slots').insert({
      listing_id: data.id, starts_at: startsAt.toISOString(), ends_at: new Date(startsAt.getTime() + 90 * 60_000).toISOString(),
      capacity: input.workshopCapacity ?? 8,
    })
    if (slot.error) throw slot.error
  }
  for (const [index, image] of input.images.entries()) {
    const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${userId}/${data.id}/${crypto.randomUUID()}-${safeName}`
    const upload = await supabase.storage.from('marketplace-listings').upload(storagePath, image, { upsert: false })
    if (upload.error) throw upload.error
    const media = await supabase.from('listing_media').insert({
      listing_id: data.id, storage_path: storagePath, alt_text_source: input.title,
      alt_text_translations: { [input.sourceLanguage]: input.title }, sort_order: index,
    })
    if (media.error) throw media.error
  }
  void supabase.functions.invoke('translate-marketplace-listing', { body: { listingId: data.id } })
  return data
}

export async function updateArtisanListing(
  userId: string,
  listing: LocalArtisanListing,
  update: { active?: boolean; quantity?: number },
) {
  if (isLocal(userId)) {
    return updateLocalArtisanListing(listing.id, {
      active: update.active ?? listing.active,
      ...(listing.kind === 'craft' && update.quantity !== undefined ? { stock: update.quantity } : {}),
      ...(listing.kind === 'workshop' && update.quantity !== undefined ? { workshopCapacity: update.quantity } : {}),
    })
  }
  const listingUpdate: { active?: boolean; stock_quantity?: number; updated_at: string } = { updated_at: new Date().toISOString() }
  if (update.active !== undefined) listingUpdate.active = update.active
  if (listing.kind === 'craft' && update.quantity !== undefined) listingUpdate.stock_quantity = update.quantity
  const result = await supabase.from('marketplace_listings').update(listingUpdate).eq('id', listing.id).eq('artisan_id', userId)
  if (result.error) throw result.error
  if (listing.kind === 'workshop' && update.quantity !== undefined) {
    const slot = await supabase.from('workshop_slots').update({ capacity: update.quantity, updated_at: new Date().toISOString() }).eq('listing_id', listing.id)
    if (slot.error) throw slot.error
  }
}

export async function loadMarketplaceModeration() {
  if (isBundledAndroidApp()) return { applications: getLocalArtisanApplication() ? [getLocalArtisanApplication()!] : [], listings: getLocalArtisanListings(), reservations: getLocalReservations(), demo: true }
  const { data, error } = await supabase.functions.invoke('marketplace-admin-dashboard')
  if (error) throw error
  const dashboard = data && typeof data === 'object' ? data as Record<string, unknown> : {}
  return {
    applications: Array.isArray(dashboard.applications) ? dashboard.applications : [],
    listings: Array.isArray(dashboard.listings) ? dashboard.listings : [],
    reservations: Array.isArray(dashboard.reservations) ? dashboard.reservations : [],
    demo: false,
  }
}

export async function reviewArtisanApplication(id: string, status: 'approved' | 'rejected', note: string, demo: boolean) {
  if (demo) return reviewLocalArtisanApplication(status, note)
  const { data, error } = await supabase.functions.invoke('review-artisan-application', { body: { applicationId: id, status, note } })
  if (error) throw error
  return data
}

export async function moderateArtisanListing(
  id: string,
  status: 'approved' | 'paused',
  note: string,
  demo: boolean,
  review?: { depositPercent: number; titleEn: string; titleHi: string; descriptionEn: string; descriptionHi: string },
) {
  if (demo) return reviewLocalArtisanListing(id, status)
  const { data, error } = await supabase.functions.invoke('moderate-marketplace-listing', { body: {
    listingId: id, status, note, depositPercent: review?.depositPercent,
    titleTranslations: review ? { en: review.titleEn, hi: review.titleHi } : undefined,
    descriptionTranslations: review ? { en: review.descriptionEn, hi: review.descriptionHi } : undefined,
  } })
  if (error) throw error
  return data
}

export async function adminCancelMarketplaceReservation(id: string, demo: boolean) {
  if (demo) return updateLocalReservation(id, { status: 'refunded' })
  const { data, error } = await supabase.functions.invoke('cancel-marketplace-reservation', {
    body: { reservationId: id, reason: 'Cancelled and refunded by marketplace admin', adminOverride: true },
  })
  if (error) throw error
  return data
}

export async function confirmMarketplaceFulfillment(userId: string, pin: string, kind: 'craft' | 'workshop') {
  if (isLocal(userId)) {
    const reservation = getLocalReservations().find((item) => item.confirmationPin === pin && item.status === 'confirmed')
    if (!reservation) throw new Error('No confirmed reservation matches that PIN.')
    updateLocalReservation(reservation.id, { status: 'completed' })
    return reservation.id
  }
  const { data, error } = await supabase.functions.invoke('confirm-marketplace-fulfilment', {
    body: { confirmationPin: pin, eventType: kind === 'craft' ? 'collected' : 'attended' },
  })
  if (error) throw error
  return data
}
