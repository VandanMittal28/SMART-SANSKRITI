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
  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const isPublicPath = PUBLIC_PATHS.has(normalizedPathname)

  useEffect(() => {
    if (loading) return
    if (!user && !isPublicPath) router.replace('/login')
    if (user && isPublicPath) router.replace('/')
  }, [isPublicPath, loading, router, user])

  // Keep the login form usable while a background session restore is pending.
  // This is especially important for an installed APK started without network.
  if (isPublicPath && !user) return <>{children}</>
  if (loading) return <LoadingScreen />
  if (!user && !isPublicPath) return <LoadingScreen />
  if (user && isPublicPath) return <LoadingScreen />
  return <>{children}</>
}
