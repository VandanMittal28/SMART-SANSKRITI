'use client'

import { useState } from 'react'
import { AlertTriangle, BadgeCheck, ChevronDown, Landmark, MapPin } from 'lucide-react'

interface ResultCardProps {
  result: Record<string, unknown>
  imagePreview?: string | null
  fileName?: string
}

const str = (value: unknown, fallback = '') => value !== undefined && value !== null ? String(value) : fallback

function Fact({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="min-w-0 border-t border-white/6 py-3">
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8891A6]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-5 text-[#F6F1E8]">{value}</dd>
    </div>
  )
}

export function ResultCard({ result, imagePreview, fileName }: ResultCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const isUnknown = Boolean(result.is_unknown)
  const rawConfidence = typeof result.confidence_score === 'number'
    ? result.confidence_score
    : typeof result.confidence === 'number'
      ? result.confidence * 100
      : 85
  const confidence = Math.round(Math.min(100, Math.max(0, rawConfidence)))
  const name = str(result.monument_name, 'Unknown monument')
  const location = str(result.location, 'Location unavailable')
  const summary = str(result.brief_description || result.history || result.significance)
  const identifiers = Array.isArray(result.key_identifiers) ? result.key_identifiers.map(String).slice(0, 4) : []
  const suggestions = Array.isArray(result.suggestions) ? result.suggestions.map(String).slice(0, 3) : []
  const reasoning = str(result.reasoning)

  return (
    <article className="overflow-hidden rounded-2xl border border-[#D6A84B]/18 bg-[#11182B]">
      <div className="relative h-[220px] bg-[#171F34]">
        {imagePreview ? (
          // User-selected blob/data URLs cannot be passed through next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagePreview} alt={`Recognized view of ${name}`} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center"><Landmark className="h-16 w-16 text-[#D6A84B]/25" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080D1D] via-transparent to-black/15" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold ${isUnknown ? 'border-[#E46F67]/30 bg-[#E46F67]/12 text-[#FFAAA4]' : 'border-[#63C7BA]/30 bg-[#0A2526]/90 text-[#8DE0D6]'}`}>
            {isUnknown ? <AlertTriangle className="h-3.5 w-3.5" /> : <BadgeCheck className="h-3.5 w-3.5" />}
            {isUnknown ? 'Match uncertain' : `${confidence}% match`}
          </span>
          <h2 className="mt-2 font-heritage text-[26px] font-bold leading-8 text-white">{name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-white/75"><MapPin className="h-3.5 w-3.5" /> {location}</p>
        </div>
      </div>

      <div className="p-4">
        {summary ? <p className="text-sm leading-6 text-[#C7CDDA]">{summary}</p> : null}

        {!isUnknown ? (
          <dl className="mt-4 grid grid-cols-2 gap-x-4">
            <Fact label="Category" value={str(result.category)} />
            <Fact label="Period" value={str(result.era_or_dynasty || result.dynasty_or_period)} />
            <Fact label="Architecture" value={str(result.architecture_style)} />
            <Fact label="Tradition" value={str(result.religion)} />
          </dl>
        ) : null}

        {identifiers.length > 0 ? (
          <div className="mt-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8891A6]">Recognized details</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 app-scroll-row">
              {identifiers.map((identifier) => <span key={identifier} className="shrink-0 rounded-lg border border-[#D6A84B]/16 bg-[#D6A84B]/7 px-2.5 py-1.5 text-xs text-[#F3DFC0]">{identifier}</span>)}
            </div>
          </div>
        ) : null}

        {suggestions.length > 0 ? (
          <div className="mt-4 rounded-xl border border-[#63C7BA]/15 bg-[#63C7BA]/[0.05] p-3">
            <p className="text-xs font-bold text-[#8DE0D6]">Possible matches</p>
            <p className="mt-1 text-sm text-[#C7CDDA]">{suggestions.join(' · ')}</p>
          </div>
        ) : null}

        <button type="button" onClick={() => setDetailsOpen((open) => !open)} className="mt-4 flex min-h-11 w-full items-center justify-between border-t border-white/7 pt-3 text-left text-xs font-bold text-[#AEB6C8]" aria-expanded={detailsOpen}>
          <span>Recognition details</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
        </button>
        {detailsOpen ? (
          <div className="rounded-xl bg-[#080D1D] p-3 text-xs leading-5 text-[#AEB6C8]">
            {reasoning || 'The image was compared with architectural form, materials and visible landmark features.'}
            <p className="mt-2 text-[10px] text-[#667086]">Source image: {fileName || 'camera capture'}</p>
          </div>
        ) : null}
      </div>
    </article>
  )
}
