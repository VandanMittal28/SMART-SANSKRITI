import type { MarketplaceReservation } from '@/lib/marketplace/types'

const RESERVATION_KEY = 'sanskriti-marketplace-reservations-v1'
const ITINERARY_KEY = 'sanskriti-marketplace-itinerary-v1'
const APPLICATION_KEY = 'sanskriti-artisan-application-v1'
const ARTISAN_LISTINGS_KEY = 'sanskriti-artisan-listings-v1'

export interface LocalArtisanApplication {
  id: string
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
  documentNames: string[]
  status: 'pending' | 'approved' | 'rejected'
  adminNote?: string
  submittedAt: string
}

export interface LocalArtisanListing {
  id: string
  title: string
  kind: 'craft' | 'workshop'
  craftType: string
  siteId: string
  price: number
  stock: number | null
  active: boolean
  workshopCapacity?: number
  workshopReserved?: number
  workshopHeld?: number
  workshopStartsAt?: string
  status: 'pending' | 'approved' | 'paused'
  createdAt: string
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

export const getLocalReservations = () => readJson<MarketplaceReservation[]>(RESERVATION_KEY, [])
export const saveLocalReservation = (reservation: MarketplaceReservation) => {
  const current = getLocalReservations().filter((item) => item.id !== reservation.id)
  writeJson(RESERVATION_KEY, [reservation, ...current])
}
export const updateLocalReservation = (id: string, update: Partial<MarketplaceReservation>) => {
  const next = getLocalReservations().map((item) => item.id === id ? { ...item, ...update } : item)
  writeJson(RESERVATION_KEY, next)
  return next.find((item) => item.id === id) ?? null
}
export const getItineraryReservations = () => readJson<string[]>(ITINERARY_KEY, [])
export const addReservationToLocalItinerary = (id: string) => {
  const ids = Array.from(new Set([...getItineraryReservations(), id]))
  writeJson(ITINERARY_KEY, ids)
  updateLocalReservation(id, { addedToItinerary: true })
}
export const getLocalArtisanApplication = () => readJson<LocalArtisanApplication | null>(APPLICATION_KEY, null)
export const saveLocalArtisanApplication = (application: LocalArtisanApplication) => writeJson(APPLICATION_KEY, application)
export const reviewLocalArtisanApplication = (status: LocalArtisanApplication['status'], adminNote = '') => {
  const current = getLocalArtisanApplication()
  if (!current) return null
  const next = { ...current, status, adminNote }
  saveLocalArtisanApplication(next)
  return next
}
export const getLocalArtisanListings = () => readJson<LocalArtisanListing[]>(ARTISAN_LISTINGS_KEY, [])
export const saveLocalArtisanListing = (listing: LocalArtisanListing) => writeJson(ARTISAN_LISTINGS_KEY, [listing, ...getLocalArtisanListings()])
export const updateLocalArtisanListing = (id: string, update: Partial<LocalArtisanListing>) => {
  const next = getLocalArtisanListings().map((item) => item.id === id ? { ...item, ...update } : item)
  writeJson(ARTISAN_LISTINGS_KEY, next)
  return next.find((item) => item.id === id) ?? null
}
export const reviewLocalArtisanListing = (id: string, status: LocalArtisanListing['status']) => {
  const next = getLocalArtisanListings().map((item) => item.id === id ? { ...item, status } : item)
  writeJson(ARTISAN_LISTINGS_KEY, next)
  return next
}
