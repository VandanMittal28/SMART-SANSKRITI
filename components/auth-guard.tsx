'use client'

import { useEffect } from 'react'
import { LoaderCircle } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'

const PUBLIC_PATHS = new Set(['/login', '/auth'])

function LoadingScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#08070f] text-[#f2ca50]">
      <LoaderCircle className="h-7 w-7 animate-spin" aria-label="Loading your profile" />
    </div>
  )
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()
  const isPublicPath = PUBLIC_PATHS.has(pathname)

  useEffect(() => {
    if (loading) return
    if (!user && !isPublicPath) router.replace('/login')
    if (user && isPublicPath) router.replace('/')
  }, [isPublicPath, loading, router, user])

  if (loading) return <LoadingScreen />
  if (!user && !isPublicPath) return <LoadingScreen />
  if (user && isPublicPath) return <LoadingScreen />
  return <>{children}</>
}
