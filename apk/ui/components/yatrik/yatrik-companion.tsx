'use client'

import { Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { YatrikArtwork } from '@/components/yatrik/yatrik-artwork'
import type { YatrikAssetManifest, YatrikState } from '@/lib/yatrik/types'

const POSITION_STORAGE_KEY = 'sanskriti-yatrik-position-v1'
const COMPANION_SIZE = 104

interface Position {
  x: number
  y: number
}

interface YatrikCompanionProps {
  manifest: YatrikAssetManifest | null
  muted: boolean
  onOpenChat: () => void
  onToggleMute: () => void
  state: YatrikState
}

function defaultPosition(): Position {
  return {
    x: Math.max(10, window.innerWidth - COMPANION_SIZE - 14),
    y: Math.max(90, window.innerHeight - COMPANION_SIZE - 134),
  }
}

function clampPosition(position: Position): Position {
  return {
    x: Math.min(Math.max(8, position.x), Math.max(8, window.innerWidth - COMPANION_SIZE - 8)),
    y: Math.min(Math.max(82, position.y), Math.max(82, window.innerHeight - COMPANION_SIZE - 118)),
  }
}

export function YatrikCompanion({
  manifest,
  muted,
  onOpenChat,
  onToggleMute,
  state,
}: YatrikCompanionProps) {
  const [position, setPosition] = useState<Position | null>(null)
  const positionRef = useRef<Position | null>(null)
  const dragRef = useRef<{
    pointerId: number
    startPointer: Position
    startPosition: Position
    moved: boolean
  } | null>(null)

  useEffect(() => {
    let restored: Position | null = null
    try {
      const raw = localStorage.getItem(POSITION_STORAGE_KEY)
      if (raw) restored = JSON.parse(raw) as Position
    } catch {
      restored = null
    }
    const next = clampPosition(restored ?? defaultPosition())
    positionRef.current = next
    setPosition(next)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (!positionRef.current) return
      const next = clampPosition(positionRef.current)
      positionRef.current = next
      setPosition(next)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!positionRef.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startPointer: { x: event.clientX, y: event.clientY },
      startPosition: positionRef.current,
      moved: false,
    }
  }, [])

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startPointer.x
    const deltaY = event.clientY - drag.startPointer.y
    if (Math.hypot(deltaX, deltaY) > 7) drag.moved = true
    const next = clampPosition({
      x: drag.startPosition.x + deltaX,
      y: drag.startPosition.y + deltaY,
    })
    positionRef.current = next
    setPosition(next)
  }, [])

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !positionRef.current) return
    dragRef.current = null
    try {
      localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(positionRef.current))
    } catch {
      // The position remains available for the current session.
    }
    if (!drag.moved) onOpenChat()
  }, [onOpenChat])

  if (!position) return null

  return (
    <div
      aria-label="Yatrik travel companion. Tap to open chat or drag to move."
      className="fixed z-[70] touch-none select-none"
      onPointerCancel={() => { dragRef.current = null }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="button"
      style={{ left: position.x, top: position.y }}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpenChat()
      }}
    >
      <YatrikArtwork manifest={manifest} size={COMPANION_SIZE} state={muted ? 'muted' : state} />
      <button
        aria-label={muted ? 'Unmute Yatrik' : 'Mute Yatrik'}
        className="absolute bottom-0 right-0 grid size-9 place-items-center rounded-full border border-[#f2ca50]/30 bg-[#11162a] text-[#f2ca50] shadow-lg"
        onClick={(event) => {
          event.stopPropagation()
          onToggleMute()
        }}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
    </div>
  )
}
