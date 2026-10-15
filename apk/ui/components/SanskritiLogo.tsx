'use client'

import Image from 'next/image'

interface SanskritiLogoProps {
  size?: number
  /**
   * `tile` renders the full brand mark on its ink square, matching the app
   * icon. `mark` renders the glyph alone on transparency, for placing on a
   * surface that already provides its own background.
   */
  variant?: 'tile' | 'mark'
  className?: string
}

/**
 * The brand mark: सं, the first syllable of संस्कृति.
 */
export default function SanskritiLogo({ size = 40, variant = 'tile', className }: SanskritiLogoProps) {
  const src = variant === 'mark' ? '/sanskriti-mark.png' : '/sanskriti-logo.png'
  return (
    <Image
      src={src}
      alt="Sanskriti AI"
      width={size}
      height={size}
      className={className}
      priority
    />
  )
}
