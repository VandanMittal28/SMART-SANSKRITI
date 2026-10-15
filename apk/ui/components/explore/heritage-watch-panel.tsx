'use client'

/**
 * Visitor-facing surface for Heritage Watch.
 *
 * Two jobs, both about keeping the visitor in control of their own camera:
 * an explicit opt-in that states plainly what leaves the phone, and a status
 * chip that is always visible while watching, with a one-tap off switch.
 * Rendered as an overlay by the Explore page so the AR HUD's documented prop
 * contract stays untouched.
 */

import { useState } from 'react'
import { CheckCircle2, ChevronDown, Eye, Loader2, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import { HERITAGE_WATCH_BY_ID, HERITAGE_WATCH_DEFINITIONS } from '@/lib/vision/taxonomy'
import type { HeritageWatchStatus } from '@/hooks/useHeritageWatch'

interface Props {
  status: HeritageWatchStatus
  /** The visitor has asked for Heritage Watch to run. */
  requested: boolean
  /** Null until the visitor has answered the opt-in once. */
  consented: boolean | null
  onConsent: (allow: boolean) => void
  onToggle: (next: boolean) => void
  onDismissError: () => void
}

const PHASE_COPY: Record<HeritageWatchStatus['phase'], string> = {
  off: 'Off',
  'awaiting-camera': 'Waiting for camera',
  starting: 'Starting…',
  watching: 'Watching',
  inspecting: 'Checking…',
  corroborating: 'Confirming',
  submitting: 'Filing…',
  unavailable: 'Unavailable',
}

export function HeritageWatchConsent({ onConsent }: { onConsent: (allow: boolean) => void }) {
  return (
    <div className="pointer-events-auto absolute inset-x-5 bottom-4 top-4 z-40 overflow-y-auto overscroll-contain rounded-[26px] border border-[#efc566]/24 bg-[#09101e]/97 p-5 shadow-2xl backdrop-blur-xl">
      <ShieldCheck className="size-8 text-[#efc566]" />
      <h2 className="mt-3 font-serif text-2xl text-[#fff0ce]">Help protect this monument</h2>
      <p className="mt-2 text-sm leading-6 text-[#c9b89b]">
        While your camera is open for navigation, Sanskriti can watch for damage to the site and
        tell the monument staff. It is off unless you turn it on.
      </p>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8fbcb6]">What it looks for</p>
        <ul className="mt-2 space-y-1">
          {HERITAGE_WATCH_DEFINITIONS.map(definition => (
            <li key={definition.id} className="text-xs leading-5 text-[#e4d6ba]">· {definition.label}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8fbcb6]">What leaves your phone</p>
        <p className="mt-2 text-xs leading-5 text-[#c9b89b]">
          Nothing, unless the same concern is seen more than once. Only then is a single still
          photo sent to the site office for a staff member to check. No video is recorded, no
          one is identified, and no penalty follows from this alone.
        </p>
      </div>

      <button
        className="mt-4 h-12 w-full rounded-2xl bg-[#efc566] font-bold text-[#201406]"
        onClick={() => onConsent(true)}
        type="button"
      >
        Turn on Heritage Watch
      </button>
      <button
        className="mt-2 h-11 w-full rounded-2xl border border-white/15 text-sm font-bold text-[#d9c9ab]"
        onClick={() => onConsent(false)}
        type="button"
      >
        Not now
      </button>
    </div>
  )
}

export function HeritageWatchPanel({
  status,
  requested,
  consented,
  onConsent,
  onToggle,
  onDismissError,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  // Asked for, but the opt-in has never been answered: that question comes
  // first, every time, before any frame is sampled.
  if (requested && consented === null) {
    return <HeritageWatchConsent onConsent={onConsent} />
  }

  const enabled = requested && consented === true

  const busy = status.phase === 'inspecting' || status.phase === 'submitting' || status.phase === 'starting'
  const pendingEntries = Object.entries(status.pending) as Array<[keyof typeof HERITAGE_WATCH_BY_ID, number]>

  return (
    <div className="pointer-events-auto absolute right-4 top-[76px] z-30 flex max-w-[232px] flex-col items-end gap-1.5">
      <button
        aria-expanded={expanded}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition-colors ${
          enabled
            ? 'border-emerald-300/25 bg-emerald-300/12 text-emerald-100'
            : 'border-white/15 bg-black/45 text-[#bfae92]'
        }`}
        onClick={() => setExpanded(value => !value)}
        type="button"
      >
        {busy ? <Loader2 className="size-3 animate-spin" /> : <Eye className="size-3" />}
        <span>Watch · {PHASE_COPY[status.phase]}</span>
        {enabled && !busy ? (
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
        ) : null}
        <ChevronDown className={`size-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {status.receipts.length > 0 && !expanded ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#efc566]/15 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#efc566]">
          <CheckCircle2 className="size-3" />
          {status.receipts.length} sent for review
        </span>
      ) : null}

      {expanded ? (
        <div className="w-[232px] rounded-[20px] border border-white/12 bg-[#07101c]/95 p-3 text-left shadow-2xl backdrop-blur-xl">
          <p className="text-[10px] leading-4 text-[#c9b89b]">{status.lastMessage || 'Heritage Watch is off.'}</p>

          {pendingEntries.length > 0 ? (
            <div className="mt-2 rounded-xl border border-amber-300/25 bg-amber-300/10 p-2">
              {pendingEntries.map(([category, count]) => (
                <p key={category} className="text-[10px] leading-4 text-amber-100">
                  {HERITAGE_WATCH_BY_ID[category].label} · seen {count}×, needs a second look
                </p>
              ))}
            </div>
          ) : null}

          {status.receipts.length > 0 ? (
            <div className="mt-2 space-y-1">
              {status.receipts.map(receipt => (
                <div key={receipt.id} className="rounded-xl border border-[#efc566]/20 bg-[#efc566]/8 p-2">
                  <p className="text-[10px] font-bold text-[#efc566]">{receipt.category}</p>
                  <p className="text-[9px] text-[#c9b89b]">
                    Awaiting staff review · {receipt.id.slice(0, 8)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {status.error ? (
            <div className="mt-2 flex items-start gap-1.5 rounded-xl border border-red-400/25 bg-red-500/10 p-2">
              <ShieldAlert className="mt-0.5 size-3 shrink-0 text-red-300" />
              <p className="flex-1 text-[10px] leading-4 text-red-200">{status.error}</p>
              <button aria-label="Dismiss error" onClick={onDismissError} type="button">
                <X className="size-3 text-red-200" />
              </button>
            </div>
          ) : null}

          <p className="mt-2 text-[9px] leading-4 text-[#7d8795]">
            {status.inspections} camera check{status.inspections === 1 ? '' : 's'} this session.
            Still photos are sent only after a repeat sighting.
          </p>

          <button
            className={`mt-2 h-9 w-full rounded-xl text-[11px] font-black ${
              enabled ? 'border border-white/15 text-[#d9c9ab]' : 'bg-[#efc566] text-[#201406]'
            }`}
            onClick={() => onToggle(!enabled)}
            type="button"
          >
            {enabled ? 'Turn off Heritage Watch' : 'Turn on Heritage Watch'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
