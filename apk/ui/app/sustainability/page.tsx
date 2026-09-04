'use client'

import { useState } from 'react'
import { Camera, Landmark, Leaf, Loader2, Quote, Sparkles } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { cn } from '@/lib/utils'

const ENVIRONMENTAL_TIPS = [
  "Carry a reusable water bottle — plastic bottles are banned near most heritage sites",
  "Use public transport or walk when possible to reduce carbon footprint",
  "Dispose of waste properly in designated bins — never litter on monument grounds",
  "Use eco-friendly sunscreen to protect ancient stone surfaces from chemical damage",
  "Support local tree-planting initiatives at heritage sites",
]

const CULTURAL_TIPS = [
  "Dress modestly and respectfully — cover shoulders and knees when visiting religious sites",
  "Follow all posted rules and guidelines — monuments are protected cultural heritage",
  "Be quiet and respectful — these are sacred spaces for many visitors",
  "Ask permission before photographing locals or religious ceremonies",
  "Learn basic greetings in the local language — it shows respect and appreciation",
]

const PHOTOGRAPHY_TIPS = [
  "Check photography rules — flash photography may be prohibited to protect ancient structures",
  "Respect ‘No Photography’ zones — some areas are restricted for conservation",
  "Don't touch or lean on monuments — oils from skin can damage delicate surfaces",
  "Use natural light instead of flash to capture authentic colours of ancient art",
  "Frame your shots thoughtfully — avoid selfie sticks that risk damaging monuments",
]

const TIP_SECTIONS = [
  { id: 'environment', title: 'Environmental', icon: Leaf, tips: ENVIRONMENTAL_TIPS },
  { id: 'culture', title: 'Cultural respect', icon: Landmark, tips: CULTURAL_TIPS },
  { id: 'photography', title: 'Responsible photography', icon: Camera, tips: PHOTOGRAPHY_TIPS },
]

const SDG_BADGES = [
  { id: 'sdg11', label: 'SDG 11', title: 'Sustainable Cities & Communities' },
  { id: 'sdg17', label: 'SDG 17', title: 'Partnerships for the Goals' },
]

export default function SustainabilityPage() {
  const [aiTips, setAiTips] = useState('')
  const [loadingTips, setLoadingTips] = useState(false)

  const getAiTips = async () => {
    setLoadingTips(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Give me 5 specific sustainability tips for visiting Indian heritage monuments',
          monument_id: 'taj-mahal'
        })
      })
      const data = await res.json()
      if (!res.ok || !data.answer) throw new Error(data.error || 'Tips unavailable')
      setAiTips(data.answer)
    } catch {
      setAiTips(ENVIRONMENTAL_TIPS.join('\n'))
    } finally {
      setLoadingTips(false)
    }
  }

  return (
    <AppShell>
      <div className="screen-gutter flex flex-col gap-6 py-5 animate-fade-in">
        <section>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#63C7BA]">
            <Leaf className="h-3.5 w-3.5" /> Responsible tourism
          </p>
          <h1 className="mt-1.5 font-heritage text-2xl font-bold text-[#F6F1E8]">Travel that protects heritage</h1>
          <p className="mt-1 text-sm leading-6 text-[#AEB6C8]">
            Follow these SDG-aligned guidelines so India&apos;s monuments outlast the visitors who love them.
          </p>
        </section>

        <section className="rounded-2xl border border-[#63C7BA]/25 bg-[#63C7BA]/[0.06] p-4">
          <p className="font-heritage text-base font-semibold text-[#8DE0D6]">&ldquo;वसुधैव कुटुम्बकम्&rdquo;</p>
          <p className="mt-0.5 text-xs text-[#AEB6C8]">The World is One Family — responsible tourism preserves shared heritage while supporting local communities.</p>
        </section>

        {TIP_SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <section key={section.id} className="app-card rounded-2xl p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#63C7BA]/12 text-[#63C7BA]">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <h2 className="font-heritage text-base font-bold text-[#F6F1E8]">{section.title}</h2>
              </div>
              <ul className="flex flex-col divide-y divide-white/[0.05]">
                {section.tips.map((tip, i) => (
                  <li key={i} className="py-2.5 text-sm leading-6 text-[#AEB6C8] first:pt-0 last:pb-0">
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        <section className="rounded-2xl border border-[#63C7BA]/25 bg-[#63C7BA]/[0.06] p-5 text-center">
          <Quote className="mx-auto h-5 w-5 text-[#63C7BA]" />
          <p className="mt-2 font-heritage text-sm leading-7 text-[#8DE0D6]">
            &ldquo;Preserving India&apos;s monuments ensures that future generations can experience 5,000 years of living heritage, architecture, and culture.&rdquo;
          </p>
        </section>

        <section className="flex flex-wrap justify-center gap-3" aria-label="Sustainable development goals">
          {SDG_BADGES.map((sdg) => (
            <div key={sdg.id} className="min-w-[160px] flex-1 rounded-xl border border-[#D6A84B]/20 bg-[#11182B] p-4 text-center">
              <p className="text-sm font-bold text-[#D6A84B]">{sdg.label}</p>
              <p className="mt-1 text-xs leading-5 text-[#AEB6C8]">{sdg.title}</p>
            </div>
          ))}
        </section>

        <section className="app-card rounded-2xl p-5 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#D6A84B]/12 text-[#D6A84B]">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <h2 className="mt-3 font-heritage text-base font-bold text-[#F6F1E8]">Get AI-powered tips</h2>
          <p className="mt-1 text-xs text-[#AEB6C8]">Ask for sustainability recommendations personalized to your trip.</p>
          <button
            onClick={getAiTips}
            disabled={loadingTips}
            className={cn(
              'mt-4 inline-flex items-center gap-2 rounded-xl bg-[#63C7BA] px-6 py-2.5 text-sm font-bold text-[#071B19] transition-opacity',
              loadingTips ? 'opacity-60' : 'active:scale-95',
            )}
          >
            {loadingTips ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading</> : 'Get AI tips'}
          </button>
          {aiTips && (
            <div className="mt-4 rounded-xl border border-[#63C7BA]/25 bg-[#63C7BA]/[0.06] p-4 text-left text-sm leading-7 whitespace-pre-wrap text-[#AEB6C8]">
              {aiTips}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
