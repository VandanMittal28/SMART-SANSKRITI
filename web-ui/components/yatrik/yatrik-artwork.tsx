'use client'

import Image from 'next/image'
import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { YatrikAssetManifest, YatrikState } from '@/lib/yatrik/types'

interface YatrikArtworkProps {
  manifest: YatrikAssetManifest | null
  state: YatrikState
  size?: number
}

export function YatrikArtwork({ manifest, state, size = 104 }: YatrikArtworkProps) {
  const [frameIndex, setFrameIndex] = useState(0)
  const [brokenFrame, setBrokenFrame] = useState<string | null>(null)
  const group = manifest?.states[state]
  const frames = group?.frames ?? []
  const frame = frames[frameIndex] ?? null

  useEffect(() => {
    setFrameIndex(0)
    setBrokenFrame(null)
  }, [manifest?.version, state])

  useEffect(() => {
    if (!group || frames.length < 2) return
    const interval = window.setInterval(() => {
      setFrameIndex((current) => {
        const next = current + 1
        if (next < frames.length) return next
        return group.loop ? 0 : current
      })
    }, Math.max(50, 1000 / group.fps))
    return () => window.clearInterval(interval)
  }, [frames.length, group])

  if (frame && frame !== brokenFrame) {
    return (
      <Image
        alt={`Yatrik ${state}`}
        className="pointer-events-none select-none object-contain drop-shadow-[0_14px_24px_rgba(29,220,197,0.28)]"
        draggable={false}
        height={size}
        onError={() => setBrokenFrame(frame)}
        priority={state === 'fly-in' || state === 'landing'}
        src={frame}
        unoptimized
        width={size}
      />
    )
  }

  return (
    <div
      aria-label={`Yatrik placeholder in ${state} state`}
      className={`yatrik-placeholder yatrik-placeholder--${state}`}
      style={{ height: size, width: size }}
    >
      <span className="yatrik-placeholder__turban" />
      <span className="yatrik-placeholder__face">•ᴗ•</span>
      <span className="yatrik-placeholder__body" />
      <span className="yatrik-placeholder__tail" />
      <Sparkles className="yatrik-placeholder__sparkle" aria-hidden="true" />
    </div>
  )
}
