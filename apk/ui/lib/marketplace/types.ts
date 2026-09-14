import type { SupportedLanguage } from '@/lib/languages'

export type MarketplaceKind = 'craft' | 'workshop'
export type MarketplaceStatus = 'payment_pending' | 'confirmed' | 'cancelled' | 'refund_pending' | 'refunded' | 'completed' | 'expired' | 'no_show'

export interface WorkshopSlot {
  id: string
  startsAt: string
  endsAt: string
  capacity: number
  reservedQuantity: number
  heldQuantity: number
}

export interface MarketplaceArtisan {
  id: string
  name: string
  story: string
  verified: boolean
  craftTraditions: string[]
  languages: string[]
  city: string
}

export interface MarketplaceListing {
  id: string
  kind: MarketplaceKind
  siteId: string
  siteName: string
  siteNameHi: string
  city: string
  state: string
  craftType: string
  sourceLanguage: SupportedLanguage
  title: string
  titleHi: string
  description: string
  descriptionHi: string
  price: number
  depositPercent: number
  stockQuantity: number | null
  distanceKm: number
  approximatePickupArea: string
  imageUrl: string
  imageAlt: string
  artisan: MarketplaceArtisan
  slots: WorkshopSlot[]
  active: boolean
}

export interface MarketplaceReservation {
  id: string
  listingId: string
  listingTitle: string
  listingKind: MarketplaceKind
  artisanName: string
  siteName: string
  quantity: number
  total: number
  deposit: number
  balance: number
  scheduledFor: string
  status: MarketplaceStatus
  confirmationPin: string
  qrToken: string
  exactPickupAddress: string
  pickupInstructions: string
  createdAt: string
  addedToItinerary: boolean
  testMode: boolean
}

export interface MarketplaceFilters {
  query: string
  siteId: string
  kind: 'all' | MarketplaceKind
  craftType: string
  maxPrice: number | null
  maxDistance: number | null
  language: string
  availableOnly: boolean
}
