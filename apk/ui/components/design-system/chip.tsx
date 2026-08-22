import * as React from 'react'
import { cn } from '@/lib/utils'

export type ChipTone = 'gold' | 'teal' | 'neutral'

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone
  children: React.ReactNode
}

export function Chip({ tone = 'gold', className, children, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
        tone === 'gold' && 'border-[#C9A84C]/25 bg-[#C9A84C]/12 text-[#F7D88C]',
        tone === 'teal' && 'border-[#4B9B8E]/25 bg-[#4B9B8E]/12 text-[#7EE4D4]',
        tone === 'neutral' && 'border-white/10 bg-white/5 text-[#D9C7AA]',
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export default Chip
