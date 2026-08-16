import { useState } from "react"
import { Mountain, CheckCircle, GraduationCap, ChevronDown, AlertTriangle } from "lucide-react"

interface ResultCardProps {
  result: Record<string, unknown>
  imagePreview?: string | null
  fileName?: string
}

// Safe string extractor for unknown values
const str = (val: unknown, fallback = ''): string =>
  val !== undefined && val !== null ? String(val) : fallback

function InfoItem({ label, value }: { label: string; value: string }) {
  if (!value) return null

  return (
    <div className="rounded-xl bg-black/20 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#8C7B63]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#F5E6D3]">{value}</p>
    </div>
  )
}

function Chip({ label, tone = "gold" }: { label: string; tone?: "gold" | "teal" }) {
  const classes =
    tone === "teal"
      ? "border-[#4B9B8E]/35 bg-[#4B9B8E]/12 text-[#7EE4D4]"
      : "border-[#C9A84C]/35 bg-[#C9A84C]/12 text-[#F7D88C]"

  return (
    <span className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}

function ConfidenceBar({ confidencePct }: { confidencePct: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#C4A882]">Confidence</span>
        <span className="font-semibold text-[#7EE4D4]">{confidencePct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-black/35">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#4B9B8E,#7EE4D4)] transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(0, confidencePct))}%` }}
        />
      </div>
    </div>
  )
}

export function ResultCard({ result, imagePreview, fileName }: ResultCardProps) {
  const isUnknown = Boolean(result.is_unknown)
  const [reasoningOpen, setReasoningOpen] = useState(false)

  const confidence = typeof result.confidence === 'number'
    ? result.confidence
    : typeof result.confidence_score === 'number'
      ? (result.confidence_score as number) / 100
      : 0.85

  const confidencePct = typeof result.confidence_score === 'number'
    ? result.confidence_score
    : Math.round(confidence * 100)

  const keyIdentifiers: string[] = Array.isArray(result.key_identifiers)
    ? (result.key_identifiers as unknown[]).map(String)
    : []

  const suggestions: string[] = Array.isArray(result.suggestions)
    ? (result.suggestions as unknown[]).map(String).slice(0, 3)
    : []

  const monumentName = str(result.monument_name, 'Unknown Monument')
  const location = str(result.location, 'Location unavailable')

  const infoCategory = str(result.category)
  const infoDynasty = str(result.era_or_dynasty || result.dynasty_or_period)
  const infoStyle = str(result.architecture_style)
  const infoReligion = str(result.religion)
  const summary = str(result.brief_description || result.history || result.significance)
  const reasoning = str(result.reasoning)

  return (
    <div className="space-y-4 px-4 py-3">
      <section className="relative h-56 overflow-hidden rounded-2xl shadow-lg shadow-black/20">
        <div className="h-full w-full bg-[#1C1638]">
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="Uploaded monument" className="w-full h-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Mountain className="h-24 w-24 text-[#C4A882]/30" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {isUnknown ? (
            <p className="text-xs font-medium text-[#E8A85C]">Result uncertain</p>
          ) : (
            <p className="text-xs font-medium text-[#7EE4D4]">Monument Identified</p>
          )}
          <h2 className="mt-1 text-xl font-semibold text-white">{monumentName}</h2>
          <p className="mt-0.5 text-xs text-white/75">{location}</p>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-white/5 p-4 shadow-lg shadow-black/20 backdrop-blur-md">
        {isUnknown ? (
          <div className="flex items-center gap-2 text-[#E8A85C]">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-semibold">Could Not Identify</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[#4B9B8E]">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">AI Match Ready</span>
          </div>
        )}

        <ConfidenceBar confidencePct={confidencePct} />

        {isUnknown ? (
          <p className="text-sm leading-relaxed text-[#C4A882]">{str(result.brief_description, 'Could not identify. Try a clearer image.')}</p>
        ) : (
          <>
            {!!summary && (
              <div className="rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/8 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#C9A84C]">
                  About this monument
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#F5E6D3]">
                  {summary}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <InfoItem label="Category" value={infoCategory} />
              <InfoItem label="Dynasty" value={infoDynasty} />
              <InfoItem label="Style" value={infoStyle} />
              <InfoItem label="Religion" value={infoReligion} />
            </div>
          </>
        )}

        <p className="text-xs text-[#8C7B63]">Uploaded: {fileName || 'image.jpg'}</p>

        <div className="flex items-center gap-2 text-sm text-[#534AB7]">
          <GraduationCap className="h-4 w-4" />
          <span>Viewing in Student Mode</span>
        </div>
      </section>

      {keyIdentifiers.length > 0 && (
        <section className="space-y-2 rounded-2xl bg-white/5 p-4 shadow-lg shadow-black/20 backdrop-blur-md">
          <p className="text-sm text-[#C4A882]">Key Identifiers</p>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {keyIdentifiers.map((id, i) => (
              <Chip key={`${id}-${i}`} label={id} />
            ))}
          </div>
        </section>
      )}

      {suggestions.length > 0 && (
        <section className="space-y-2 rounded-2xl bg-white/5 p-4 shadow-lg shadow-black/20 backdrop-blur-md">
          <p className="text-sm text-[#C4A882]">Did you mean?</p>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {suggestions.map((name, i) => (
              <Chip key={`${name}-${i}`} label={name} tone="teal" />
            ))}
          </div>
        </section>
      )}

      {!!reasoning && (
        <section className="rounded-2xl bg-white/5 p-4 shadow-lg shadow-black/20 backdrop-blur-md">
          <button
            onClick={() => setReasoningOpen(prev => !prev)}
            className="flex w-full items-center justify-between text-left text-sm text-[#C4A882] transition-colors hover:text-[#F5E6D3]"
            aria-expanded={reasoningOpen}
          >
            <span>Why this result?</span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${reasoningOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${reasoningOpen ? 'mt-3 max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="rounded-xl bg-black/25 p-3 text-sm leading-relaxed text-[#C4A882]">
              {reasoning}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
