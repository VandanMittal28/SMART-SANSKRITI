"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { 
  Home, Map, Camera, MessageCircle, Leaf, HelpCircle,
  Trophy, Calendar, Search, MapPin, Ticket
} from "lucide-react"
import { useUser } from '@/lib/userContext'
import { useAuth } from '@/lib/authContext'
import { useLang } from '@/lib/languageContext'

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/recognition", icon: Camera, label: "Recognition" },
  { href: "/chat", icon: MessageCircle, label: "SANSKRITI BOT" },
  { href: "/sustainability", icon: Leaf, label: "Sustainability" },
  { href: "/quiz", icon: HelpCircle, label: "Quiz" },
  { href: "/hunt", icon: Search, label: "Treasure Hunt" },
  { href: "/itinerary", icon: MapPin, label: "Itinerary" },
  { href: "/tickets", icon: Ticket, label: "Monument Tickets" },
  { href: "/achievements", icon: Trophy, label: "Achievements" },
  { href: "/festivals", icon: Calendar, label: "Festival Calendar" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { userType, userConfig, setUserType } = useUser()
  const { user, profile } = useAuth()
  const { lang, toggleLang } = useLang()

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[280px] flex-col bg-[#0F0B1E] border-r border-[#C9A84C]/30 z-50">
      {/* Logo */}
      <div className="p-6 border-b border-[#C9A84C]/20">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-lg border border-[#C9A84C]/30 bg-[#0e1222]">
            <Image src="/sanskriti-logo.svg" alt="Sanskriti AI logo" width={40} height={40} className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold text-[#C9A84C]">Sanskriti AI</h1>
            <p className="text-xs text-[#C4A882]">Heritage Guide</p>
          </div>
        </Link>

        {/* User info */}
        {user && (
          <div style={{
            padding: '12px', marginTop: '12px',
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: '12px',
          }}>
            <div style={{ color: '#E8C97A', fontSize: '13px', fontWeight: 700 }}>
              👤 {profile?.full_name || user.email?.split('@')[0]}
            </div>
            <div style={{ color: '#7A6E5C', fontSize: '11px', marginTop: '2px' }}>
              {user.email}
            </div>
            {profile?.phone && (
              <div style={{ color: '#7A6E5C', fontSize: '11px' }}>📱 {profile.phone}</div>
            )}
            <button
              onClick={async () => {
                const { signOut } = await import('@/lib/authClient')
                await signOut()
                window.location.href = '/auth'
              }}
              style={{
                marginTop: '8px', width: '100%', padding: '6px', borderRadius: '8px',
                background: 'rgba(196,91,58,0.15)', border: '1px solid rgba(196,91,58,0.4)',
                color: '#E8A85C', fontSize: '12px', cursor: 'pointer', fontWeight: 600
              }}
            >🚪 Sign Out</button>
          </div>
        )}

        {/* Language toggle */}
        <button
          type="button"
          onClick={toggleLang}
          style={{
            width: '100%', padding: '8px 12px', marginTop: '10px',
            background: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: '10px', color: '#C9A84C',
            fontSize: '13px', fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.2s ease'
          }}
        >
          {lang === 'en' ? '🇮🇳 हिंदी में देखें' : '🇬🇧 Switch to English'}
        </button>

        {/* User Mode Badge */}
        {userConfig && (
          <div style={{ marginTop: '10px' }}>
            <div style={{
              display: 'inline-block',
              background: userConfig.bg,
              border: `1px solid ${userConfig.border}`,
              borderRadius: '999px', padding: '4px 12px',
              fontSize: '12px', color: userConfig.color,
              fontWeight: 700, marginBottom: '8px'
            }}>
              {userConfig.label} Mode
            </div>
            <br/>
            <button
              onClick={() => setUserType(userType === 'student' ? 'tourist' : 'student')}
              style={{
                background: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.3)',
                color: '#C9A84C', borderRadius: '8px',
                padding: '6px 12px', fontSize: '11px',
                cursor: 'pointer', width: '100%'
              }}
            >
              Switch to {userType === 'student' ? '🧳 Tourist' : '🎓 Student'}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                isActive 
                  ? "bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/50" 
                  : "text-[#C4A882] hover:bg-[#1C1638] hover:text-[#F5E6D3]"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-[#C9A84C]" : "group-hover:text-[#C9A84C]"}`} />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-2 h-2 rounded-full bg-[#C9A84C]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Explorer Progress */}
      <div className="p-4 border-t border-[#C9A84C]/20">
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-[#C4A882] mb-1">Explorer Progress</p>
          <p className="font-serif text-[#C9A84C] font-semibold">
            {profile?.full_name || 'Explorer'}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[#534AB7] font-bold">⚡ {profile?.total_xp || 0} XP</span>
          </div>
          <div className="mt-2 h-2 bg-[#1C1638] rounded-full overflow-hidden">
            <div className="h-full gold-gradient rounded-full" style={{ width: `${Math.min(100, ((profile?.total_xp || 0) / 500) * 100)}%` }} />
          </div>
          <p className="text-xs text-[#C4A882] mt-1">{profile?.total_xp || 0} / 500 XP to next level</p>
          
          <div className="mt-4 flex gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-[#4B9B8E]/20 rounded-full text-xs text-[#4B9B8E]">
              ⭐ First Steps
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-[#4B9B8E]/20 rounded-full text-xs text-[#4B9B8E]">
              🧭 Explorer
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
