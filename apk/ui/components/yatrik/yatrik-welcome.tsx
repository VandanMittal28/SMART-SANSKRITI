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
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[rgba(14,16,11,0.45)] px-5 backdrop-blur-xl">
      {/* A single warm halo behind the character, taking its hue from the
          accent rather than the old teal/gold pair. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(246,192,10,0.22),transparent_34%)]" />
      <section className="relative flex w-full max-w-sm flex-col items-center text-center">
        <div className={`yatrik-welcome-art yatrik-welcome-art--${state}`}>
          <YatrikArtwork manifest={manifest} size={220} state={muted ? 'muted' : state} />
        </div>

        <div className="surface mt-1 w-full p-6 shadow-[var(--shadow-raised)]">
          <p className="eyebrow">Your heritage companion</p>
          <h1 className="mt-2.5 font-display text-[30px] font-semibold leading-tight tracking-[-0.03em] text-[var(--foreground)]">
            Hi, I&apos;m <span className="text-accent-word">Yatrik.</span>
          </h1>
          <p className="mt-2.5 text-[14px] leading-6 text-[var(--muted-foreground)]">
            Your travel buddy for stories, routes and discoveries.
          </p>

          {error && (
            <p className="mt-3.5 rounded-[18px] bg-[var(--destructive)]/10 px-4 py-3 text-[13px] leading-5 text-[var(--destructive)]" role="alert">
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center gap-2.5">
            <button
              aria-label={muted ? 'Unmute Yatrik' : 'Mute Yatrik'}
              className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--muted)] text-[var(--foreground)] transition-transform active:scale-95 disabled:cursor-wait disabled:opacity-50"
              disabled={saving}
              onClick={onToggleMute}
              type="button"
            >
              {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </button>
            <button
              className="btn-primary flex-1 disabled:cursor-wait"
              disabled={!ready || saving}
              onClick={onContinue}
              type="button"
            >
              {saving ? 'Yatrik is speaking…' : ready ? 'Continue' : 'Yatrik is landing…'}
            </button>
          </div>

          <p className="mt-3.5 text-[11px] leading-4 text-[var(--muted-foreground)]">
            Continue plays Yatrik&apos;s warm NVIDIA voice before opening the app.
          </p>
        </div>
      </section>
    </div>
  )
}
