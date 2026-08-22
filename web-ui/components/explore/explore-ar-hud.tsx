'use client'

import Image from 'next/image'
import {
  ArrowLeft,
  ChevronDown,
  Compass,
  LocateFixed,
  Map,
  Navigation,
  Pause,
  Play,
  Radio,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'

export type ExploreMode = 'live' | 'demo' | 'fallback'
export type ExploreArrivalStatus = 'approaching' | 'inside' | 'arrived'
export type ExploreNarrationStatus = 'idle' | 'loading' | 'speaking' | 'ready'
export type ExploreFallbackStatus =
  | 'none'
  | 'camera-denied'
  | 'location-denied'
  | 'orientation-unavailable'

export interface ExploreARHudState {
  activeZone: {
    name: string
    emoji: string
    radiusMeters: number
    xp: number
  }
  arrivalStatus: ExploreArrivalStatus
  bearingDegrees: number
  caption: string
  distanceMeters: number
  fallbackStatus: ExploreFallbackStatus
  miniFact?: string
  mode: ExploreMode
  narrationStatus: ExploreNarrationStatus
  story?: string
  targetVisible: boolean
  totalZones: number
  xpEarned?: number
  zoneIndex: number
}

interface MonumentOption {
  id: string
  name: string
}

interface ExploreARHudProps {
  monumentId: string
  monuments: MonumentOption[]
  muted: boolean
  onArrive: () => void
  onBack: () => void
  onComplete: () => void
  onMonumentChange: (id: string) => void
  onNextZone: () => void
  onPauseNarration: () => void
  onPlayNarration: () => void
  onToggleMute: () => void
  onUseMapFallback?: () => void
  state: ExploreARHudState
}

const fallbackCopy: Record<Exclude<ExploreFallbackStatus, 'none'>, string> = {
  'camera-denied': 'Camera access is unavailable. Continue with map and compass guidance.',
  'location-denied': 'Location access is unavailable. Enable it or continue with map guidance.',
  'orientation-unavailable': 'Device heading is unavailable. The map can still guide your route.',
}

function normalizeBearing(value: number): number {
  return ((value % 360) + 360) % 360
}

function edgePosition(bearingDegrees: number): { left: string; top: string } {
  const radians = (normalizeBearing(bearingDegrees) - 90) * Math.PI / 180
  return {
    left: `${50 + Math.cos(radians) * 38}%`,
    top: `${48 + Math.sin(radians) * 34}%`,
  }
}

export function ExploreARHud({
  monumentId,
  monuments,
  muted,
  onArrive,
  onBack,
  onComplete,
  onMonumentChange,
  onNextZone,
  onPauseNarration,
  onPlayNarration,
  onToggleMute,
  onUseMapFallback,
  state,
}: ExploreARHudProps) {
  const bearing = normalizeBearing(state.bearingDegrees)
  const arrowPosition = edgePosition(bearing)
  const progress = Math.round(((state.zoneIndex + (state.arrivalStatus === 'arrived' ? 1 : 0)) / state.totalZones) * 100)
  const canArrive = state.mode === 'demo' || state.arrivalStatus === 'inside'
  const isFinalZone = state.zoneIndex === state.totalZones - 1

  return (
    <main className="fixed inset-0 z-[55] mx-auto h-[100dvh] w-full max-w-[420px] overflow-hidden bg-[#050814] text-[#f8ecd2] shadow-[0_0_80px_rgba(0,0,0,.65)]">
      <section className="relative z-20 flex h-[25dvh] min-h-[188px] flex-col border-b border-[#efc566]/20 bg-[linear-gradient(180deg,rgba(7,11,23,.98),rgba(12,22,39,.94))] px-4 pb-3 pt-[calc(10px+env(safe-area-inset-top))] shadow-[0_18px_50px_rgba(0,0,0,.4)]">
        <div className="flex items-center gap-2">
          <button
            aria-label="Leave Explore"
            className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-[#f6ddb0]"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="size-4" />
          </button>

          <label className="relative min-w-0 flex-1 rounded-2xl border border-[#efc566]/18 bg-[#efc566]/8 px-3 py-2">
            <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-[#9d8e72]">Active mission</span>
            <select
              aria-label="Choose monument journey"
              className="w-full appearance-none truncate bg-transparent pr-5 font-serif text-[15px] font-bold text-[#ffe7b0] outline-none"
              onChange={(event) => onMonumentChange(event.target.value)}
              value={monumentId}
            >
              {monuments.map((monument) => (
                <option className="bg-[#10172a] text-[#ffe7b0]" key={monument.id} value={monument.id}>
                  {monument.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute bottom-3 right-3 size-3.5 text-[#efc566]" />
          </label>

          <button
            aria-label={muted ? 'Unmute Yatrik' : 'Mute Yatrik'}
            className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[#efc566]/20 bg-[#efc566]/10 text-[#efc566]"
            onClick={onToggleMute}
            type="button"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>

        <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">{state.activeZone.emoji}</span>
              <h1 className="truncate font-serif text-lg font-bold text-[#fff0cd]">{state.activeZone.name}</h1>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8fbcb6]">
              Zone {state.zoneIndex + 1} of {state.totalZones} · {state.activeZone.radiusMeters}m geofence
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-black/20 px-2.5 py-2">
            <div className="relative grid size-9 place-items-center rounded-full border border-[#efc566]/25">
              <Compass className="size-5 text-[#7ad7c9]" />
              <Navigation
                className="absolute size-3.5 fill-[#efc566] text-[#efc566] transition-transform duration-500"
                style={{ transform: `rotate(${bearing}deg)` }}
              />
            </div>
            <div className="text-right">
              <p className="font-serif text-xl font-bold leading-none text-[#efc566]">{state.distanceMeters}m</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-[#8f816b]">{Math.round(bearing)}° bearing</p>
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <div className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.15em] text-[#877a65]">
            <span>Journey progress</span><span>{progress}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#55c7b6,#efc566)] transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </section>

      <section className="relative h-[75dvh] min-h-0 overflow-hidden bg-[#101827]">
        <Image
          alt="Synthetic camera preview of Indian heritage monuments"
          className="object-cover opacity-55 saturate-[.72]"
          fill
          priority
          sizes="(max-width: 420px) 100vw, 420px"
          src="/hero-monuments.png"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,10,18,.35),rgba(2,8,14,.04)_45%,rgba(2,6,13,.88)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,transparent_0,transparent_22%,rgba(3,12,18,.18)_58%,rgba(3,8,14,.55)_100%)]" />

        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${state.mode === 'demo' ? 'border-amber-300/30 bg-amber-300/15 text-amber-100' : 'border-emerald-300/25 bg-emerald-300/12 text-emerald-100'}`}>
            {state.mode === 'demo' ? <Sparkles className="size-3" /> : <Radio className="size-3" />}
            {state.mode === 'demo' ? 'Demo · Synthetic GPS' : state.mode === 'live' ? 'Live exploration' : 'Fallback guidance'}
          </span>
          {state.narrationStatus === 'loading' && <span className="rounded-full bg-black/45 px-2 py-1 text-[10px] text-[#ead6b0]">Preparing story…</span>}
        </div>

        {state.fallbackStatus !== 'none' ? (
          <div className="absolute inset-x-5 top-[18%] rounded-[26px] border border-[#efc566]/24 bg-[#09101e]/92 p-5 text-center shadow-2xl backdrop-blur-xl">
            <Map className="mx-auto size-8 text-[#efc566]" />
            <h2 className="mt-3 font-serif text-2xl text-[#fff0ce]">Continue with map guidance</h2>
            <p className="mt-2 text-sm leading-6 text-[#c9b89b]">{fallbackCopy[state.fallbackStatus]}</p>
            <button className="mt-4 h-12 w-full rounded-2xl bg-[#efc566] font-bold text-[#201406]" onClick={onUseMapFallback} type="button">
              Open map and compass
            </button>
          </div>
        ) : (
          <>
            <div className="absolute bottom-[24%] left-1/2 h-[25%] w-[82%] -translate-x-1/2 rounded-[50%] border border-[#efc566]/40 bg-[#efc566]/5 shadow-[0_0_55px_rgba(239,197,102,.16),inset_0_0_36px_rgba(239,197,102,.08)]" aria-label="Golden geofence boundary" />

            {state.targetVisible ? (
              <div className="absolute left-1/2 top-[43%] grid size-32 -translate-x-1/2 -translate-y-1/2 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full border border-[#efc566]/30" />
                <span className="absolute inset-3 rounded-full border border-[#efc566]/60 shadow-[0_0_40px_rgba(239,197,102,.42)]" />
                <span className="absolute inset-10 rounded-full border-2 border-[#fff0b3] bg-[#efc566]/10" />
                <LocateFixed className="size-7 text-[#fff0b3] drop-shadow-[0_0_10px_rgba(239,197,102,.9)]" />
                <span className="absolute top-full mt-2 rounded-full border border-[#efc566]/25 bg-black/55 px-3 py-1 text-[10px] font-bold text-[#ffe5a7]">Target in view · {state.distanceMeters}m</span>
              </div>
            ) : (
              <div
                className="absolute grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border border-[#efc566]/40 bg-[#121524]/82 text-[#efc566] shadow-[0_0_34px_rgba(239,197,102,.3)] backdrop-blur-md"
                style={arrowPosition}
              >
                <Navigation className="size-7 fill-[#efc566] transition-transform duration-500" style={{ transform: `rotate(${bearing}deg)` }} />
                <span className="sr-only">Target is off screen at bearing {Math.round(bearing)} degrees</span>
              </div>
            )}
          </>
        )}

        <div className="absolute inset-x-4 bottom-[calc(18px+env(safe-area-inset-bottom))] space-y-2.5">
          <div className="rounded-2xl border border-white/10 bg-[#07101c]/82 px-3.5 py-3 shadow-xl backdrop-blur-xl">
            <div className="flex items-start gap-2.5">
              <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#55c7b6]/16 text-[#79dfd0]">
                <Sparkles className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#79dfd0]">Yatrik says</p>
                <p data-no-translate className="mt-1 line-clamp-2 text-sm leading-5 text-[#f7ead1]">{state.caption}</p>
              </div>
              {state.narrationStatus === 'speaking' ? (
                <button aria-label="Pause narration" className="grid size-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5" onClick={onPauseNarration} type="button"><Pause className="size-3.5" /></button>
              ) : state.narrationStatus === 'ready' ? (
                <button aria-label="Play narration" className="grid size-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5" onClick={onPlayNarration} type="button"><Play className="size-3.5" /></button>
              ) : null}
            </div>
          </div>

          {state.arrivalStatus === 'arrived' && state.story ? (
            <div className="rounded-[22px] border border-[#efc566]/30 bg-[#0a1020]/94 p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-[linear-gradient(135deg,#efc566,#da8f38)] px-3 py-1 text-xs font-black text-[#241507]">+{state.xpEarned ?? state.activeZone.xp} XP</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6fd6c6]">Arrival unlocked</span>
              </div>
              <p data-no-translate className="mt-2 line-clamp-2 text-sm leading-5 text-[#f6e9d0]">{state.story}</p>
              {state.miniFact && <p data-no-translate className="mt-2 line-clamp-1 text-xs text-[#86cabe]">💡 {state.miniFact}</p>}
              <button
                className="mt-3 h-11 w-full rounded-2xl bg-[linear-gradient(135deg,#efc566,#d99b44)] text-sm font-black text-[#211406]"
                onClick={isFinalZone ? onComplete : onNextZone}
                type="button"
              >
                {isFinalZone ? 'Complete this journey' : 'Guide me to the next zone'}
              </button>
            </div>
          ) : (
            <button
              className="flex h-13 w-full items-center justify-center gap-2 rounded-[20px] border border-[#70d6c6]/30 bg-[linear-gradient(135deg,rgba(47,150,139,.94),rgba(31,105,104,.96))] px-4 py-3.5 text-base font-black text-white shadow-[0_16px_36px_rgba(20,103,98,.32)] disabled:border-white/10 disabled:bg-[#252d38] disabled:text-[#818b92]"
              disabled={!canArrive}
              onClick={onArrive}
              type="button"
            >
              <LocateFixed className="size-5" />
              {state.mode === 'demo' ? 'Demo: I’m here' : canArrive ? 'I’m here' : `Move within ${state.activeZone.radiusMeters}m to arrive`}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
