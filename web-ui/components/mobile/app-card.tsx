import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AppCardProps = {
  children: ReactNode
  className?: string
}

export function AppCard({ children, className }: AppCardProps) {
  return <div className={cn('app-card rounded-[20px] p-4', className)}>{children}</div>
}