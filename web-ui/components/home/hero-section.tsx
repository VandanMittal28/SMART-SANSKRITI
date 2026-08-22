"use client"
import { Sparkles } from "lucide-react"
import Link from "next/link"
import { useLang } from "@/lib/languageContext"

export function HeroSection() {
  const { t } = useLang()
  return (
    <section className="relative h-[440px] rounded-2xl overflow-hidden glass-card animate-slide-up">
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-monuments.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', transformOrigin: 'center center', animation: 'heroRotate 60s linear infinite, heroGlow 8s ease-in-out infinite', willChange: 'transform' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(10,8,28,0.92) 0%, rgba(10,8,28,0.65) 50%, rgba(10,8,28,0.4) 100%)' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,8,28,0.85) 0%, transparent 60%)' }}/>
      </div>
      <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C9A84C]/20 border border-[#C9A84C]/50 mb-6 animate-fade-in" style={{ backdropFilter: 'blur(8px)' }}>
          <Sparkles className="w-4 h-4 text-[#C9A84C]" />
          <span className="text-sm font-medium text-[#C9A84C]">{t('hero_badge')}</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
          <span className="text-[#F5E6D3]">{t('hero_title_1')}</span><br />
          <span className="text-gold-gradient">{t('hero_title_2')}</span>
        </h1>
        <p className="text-[#C4A882] text-lg md:text-xl max-w-2xl mb-8" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>{t('hero_desc')}</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/recognition" className="px-8 py-3 gold-gradient text-[#0F0B1E] font-semibold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#C9A84C]/30">{t('start_exploring')}</Link>
          <Link href="/map" className="px-8 py-3 border border-[#C9A84C]/50 text-[#C9A84C] font-semibold rounded-xl transition-all duration-300 hover:bg-[#C9A84C]/10 hover:scale-105" style={{ backdropFilter: 'blur(6px)' }}>{t('view_map')}</Link>
        </div>
      </div>
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-[#C9A84C]/40 z-10" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-[#C9A84C]/40 z-10" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-[#C9A84C]/40 z-10" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-[#C9A84C]/40 z-10" />
    </section>
  )
}
