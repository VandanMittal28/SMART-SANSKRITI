import { Suspense } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { MarketplaceDetailClient } from './marketplace-detail-client'

export default function MarketplaceDetailPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#080D1D]"><Spinner className="size-9 text-[#D6A84B]" /></div>}>
      <MarketplaceDetailClient />
    </Suspense>
  )
}

