'use client'
import { ReactNode } from 'react'
import { YatrikProvider } from '@/components/yatrik/yatrik-provider'

export function AppWrapper({ children }: { children: ReactNode }) {
  return (
    <YatrikProvider>
      {children}
    </YatrikProvider>
  )
}
