'use client'

import { Volume2, VolumeX } from 'lucide-react'
import { YatrikArtwork } from '@/components/yatrik/yatrik-artwork'
import type { YatrikAssetManifest, YatrikState } from '@/lib/yatrik/types'

interface YatrikWelcomeProps {
  error: string | null
  manifest: YatrikAssetManifest | null
  muted: boolean
  onContinue: () => void
  onToggleMute: () => void
  ready: boolean
  saving: boolean
  state: YatrikState
}

export function YatrikWelcome({
  error,
  manifest,
  muted,
  onContinue,
  onToggleMute,
  ready,
  saving,
  state,
}: YatrikWelcomeProps) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#050816]/55 px-5 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(39,199,177,0.20),transparent_28%),radial-gradient(circle_at_50%_70%,rgba(221,171,65,0.17),transparent_32%)]" />
      <section className="relative flex w-full max-w-sm flex-col items-center text-center">
        <div className={`yatrik-welcome-art yatrik-welcome-art--${state}`}>
          <YatrikArtwork manifest={manifest} size={220} state={muted ? 'muted' : state} />
        </div>
        <div className="mt-1 w-full rounded-[28px] border border-[#f1c66f]/25 bg-[#10162a]/90 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#78dccd]">Your heritage companion</p>
          <h1 className="mt-2 font-serif text-3xl text-[#fff0ce]">Hi, I&apos;m Yatrik.</h1>
          <p className="mt-2 text-base leading-6 text-[#ddc7a7]">Your travel buddy for stories, routes, and discoveries.</p>
          {error && <p className="mt-3 rounded-xl border border-red-400/25 bg-red-950/30 p-2.5 text-sm text-red-100" role="alert">{error}</p>}
          <div className="mt-5 flex items-center gap-2">
            <button
              aria-label={muted ? 'Unmute Yatrik' : 'Mute Yatrik'}
              className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-[#f2ca50]"
              onClick={onToggleMute}
              type="button"
            >
              {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </button>
            <button
              className="h-12 flex-1 rounded-2xl bg-gradient-to-r from-[#d99b3c] to-[#f1ca78] font-bold text-[#241508] shadow-[0_14px_34px_rgba(224,160,68,0.22)] disabled:cursor-wait disabled:opacity-55"
              disabled={!ready || saving}
              onClick={onContinue}
              type="button"
            >
              {saving ? 'Saving your welcome...' : ready ? 'Continue' : 'Yatrik is landing...'}
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-4 text-[#9f8c71]">Continue enables Yatrik&apos;s spoken introduction. Captions always remain available.</p>
        </div>
      </section>
    </div>
  )
}
