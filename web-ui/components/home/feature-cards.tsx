"use client"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useLang } from "@/lib/languageContext"

function FeatureCard({ icon, titleKey, descKey, href, ctaKey }: { icon: string; titleKey: string; descKey: string; href: string; ctaKey: string }) {
  const { t } = useLang()
  return (
    <div className="glass-card rounded-xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-[#C9A84C]/60 group">
      <span className="text-4xl mb-4 block">{icon}</span>
      <h3 className="font-serif text-xl font-bold text-[#F5E6D3] mb-2">{t(titleKey)}</h3>
      <p className="text-[#C4A882] text-sm mb-4 leading-relaxed">{t(descKey)}</p>
      <Link href={href} className="inline-flex items-center gap-2 px-4 py-2 gold-gradient text-[#0F0B1E] text-sm font-semibold rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#C9A84C]/30">
        {t(ctaKey)}<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  )
}

const featuresRow1 = [
  { icon: "🪔", titleKey: "smart_recognition", descKey: "smart_recognition_d", href: "/recognition", ctaKey: "identify_now" },
  { icon: "📜", titleKey: "heritage_chatbot", descKey: "heritage_chatbot_d", href: "/chat", ctaKey: "start_chat" },
  { icon: "⏳", titleKey: "time_travel", descKey: "time_travel_d", href: "/monument/taj-mahal", ctaKey: "explore_eras" },
]

const featuresRow2 = [
  { icon: "🗓️", titleKey: "festival_calendar", descKey: "festival_calendar_d", href: "/festivals", ctaKey: "view_calendar" },
]

export function FeatureCards() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {featuresRow1.map((feature, index) => (
          <div key={feature.titleKey} className={`animate-fade-in stagger-${index + 1}`}><FeatureCard {...feature} /></div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {featuresRow2.map((feature, index) => (
          <div key={feature.titleKey} className={`animate-fade-in stagger-${index + 4}`}><FeatureCard {...feature} /></div>
        ))}
      </div>
    </div>
  )
}
