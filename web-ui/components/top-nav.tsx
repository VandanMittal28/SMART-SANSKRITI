'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/authContext'
import { useLang } from '@/lib/languageContext'
import { useUser } from '@/lib/userContext'
import {
  Home, Map, Camera, MessageCircle,
  HelpCircle, Trophy, Calendar, Search,
  MapPin, Menu, X, ChevronDown
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', icon: Home, key: 'nav_home' },
  { href: '/recognition', icon: Camera, key: 'nav_recognition' },
  { href: '/explore', icon: Map, key: 'nav_explore' },
  { href: '/chat', icon: MessageCircle, key: 'nav_chatbot' },
  { href: '/hunt', icon: Search, key: 'nav_hunt' },
  { href: '/achievements', icon: Trophy, key: 'nav_achievements' },
  { href: '/festivals', icon: Calendar, key: 'nav_festivals' },
  { href: '/itinerary', icon: MapPin, key: 'nav_itinerary' },
]

export function TopNav() {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const { lang, toggleLang, t } = useLang()
  const { userType, userConfig, setUserType } = useUser()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  return (
    <>
      <style>{`
        .nav-label { display: inline; }
        .mobile-menu-btn { display: none !important; }
        @media (max-width: 1024px) {
          .nav-label { display: none !important; }
        }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .desktop-controls { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        .nav-link:hover {
          background: rgba(201,168,76,0.08) !important;
          color: #E8C97A !important;
        }
        .top-nav-scrolled {
          box-shadow: 0 4px 30px rgba(0,0,0,0.6) !important;
          background: rgba(8,6,22,0.98) !important;
        }
      `}</style>

      <header
        className={scrolled ? 'top-nav-scrolled' : ''}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: '60px',
          background: 'rgba(10,8,28,0.96)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(201,168,76,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          zIndex: 1000,
          transition: 'all 0.3s ease',
        }}
      >
        {/* Logo space */}
        <Link href="/" style={{
          display: 'flex', alignItems: 'center',
          gap: '8px', textDecoration: 'none', flexShrink: 0
        }}>
          {/* Logo removed per request */}
        </Link>

        {/* Desktop nav links */}
        <nav className="desktop-nav" style={{
          display: 'flex', alignItems: 'center',
          gap: '1px', flex: 1,
          justifyContent: 'center',
          padding: '0 0.5rem',
          overflowX: 'auto',
        }}>
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className="nav-link"
                style={{
                  display: 'flex', alignItems: 'center',
                  gap: '5px', padding: '6px 9px',
                  borderRadius: '8px', textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#C9A84C' : '#C4A882',
                  background: isActive
                    ? 'rgba(201,168,76,0.12)' : 'transparent',
                  border: isActive
                    ? '1px solid rgba(201,168,76,0.3)'
                    : '1px solid transparent',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                <item.icon size={13} />
                <span className="nav-label">{t(item.key)}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right controls */}
        <div className="desktop-controls" style={{
          display: 'flex', alignItems: 'center',
          gap: '6px', flexShrink: 0
        }}>
          <button type="button" onClick={toggleLang}
            style={{
              padding: '5px 9px',
              background: 'rgba(201,168,76,0.08)',
              border: '1px solid rgba(201,168,76,0.2)',
              borderRadius: '7px', color: '#C9A84C',
              fontSize: '11px', fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap'
            }}>
            {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 EN'}
          </button>

          {userConfig && (
            <button onClick={() => setUserType(
              userType === 'student' ? 'tourist' : 'student'
            )} style={{
              padding: '5px 9px',
              background: userConfig.bg,
              border: `1px solid ${userConfig.border}`,
              borderRadius: '7px', color: userConfig.color,
              fontSize: '11px', fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap'
            }}>
              {userConfig.icon} {userType === 'student' ? t('student') : t('tourist')}
            </button>
          )}

          <div style={{
            background: 'linear-gradient(135deg, #C9A84C, #D4893F)',
            borderRadius: '20px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            border: '1px solid #C9A84C',
            minWidth: '90px',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '16px' }}>⚡</span>
            <span style={{
              color: '#1A0F00',
              fontWeight: '700',
              fontSize: '15px',
              fontFamily: 'Georgia, serif',
              letterSpacing: '0.5px'
            }}>
              {(profile?.total_xp ?? 0).toLocaleString()} XP
            </span>
          </div>

          {user && (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  display: 'flex', alignItems: 'center',
                  gap: '6px', padding: '5px 9px',
                  background: 'rgba(28,22,56,0.9)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: '7px', cursor: 'pointer',
                  color: '#C4A882', fontSize: '12px',
                  transition: 'all 0.2s'
                }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #D4893F, #C9A84C)',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0F0B1E', fontSize: '10px', fontWeight: 800
                }}>
                  {(profile?.full_name || user.email || 'U')[0].toUpperCase()}
                </div>
                <span style={{
                  maxWidth: '70px', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
                <ChevronDown size={11} />
              </button>

              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: '110%', right: 0,
                  background: 'rgba(12,9,26,0.99)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  borderRadius: '12px', padding: '8px',
                  minWidth: '180px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                  zIndex: 999
                }}>
                  <div style={{
                    padding: '8px 10px',
                    borderBottom: '1px solid rgba(201,168,76,0.1)',
                    marginBottom: '6px'
                  }}>
                    <div style={{ color: '#E8C97A', fontSize: '13px', fontWeight: 700 }}>
                      {profile?.full_name || 'Explorer'}
                    </div>
                    <div style={{ color: '#7A6E5C', fontSize: '11px' }}>
                      @{user.username}
                    </div>
                    {profile?.phone && (
                      <div style={{ color: '#7A6E5C', fontSize: '11px' }}>
                        📱 {profile.phone}
                      </div>
                    )}
                  </div>
                  <Link href="/achievements" onClick={() => setUserMenuOpen(false)}
                    style={{ display: 'block', padding: '7px 10px', color: '#C4A882', textDecoration: 'none', fontSize: '13px', borderRadius: '8px' }}>
                    {t('my_achievements')}
                  </Link>
                  <Link href="/itinerary" onClick={() => setUserMenuOpen(false)}
                    style={{ display: 'block', padding: '7px 10px', color: '#C4A882', textDecoration: 'none', fontSize: '13px', borderRadius: '8px' }}>
                    {t('my_itinerary')}
                  </Link>
                  <button onClick={async () => {
                    setUserMenuOpen(false)
                    const { signOut } = await import('@/lib/authClient')
                    await signOut()
                    window.location.href = '/login'
                  }} style={{
                    display: 'block', width: '100%', padding: '7px 10px', textAlign: 'left',
                    background: 'rgba(196,91,58,0.12)', border: 'none', borderRadius: '8px',
                    color: '#E8A85C', fontSize: '13px', cursor: 'pointer', marginTop: '4px'
                  }}>
                    {t('sign_out')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: '8px', padding: '7px',
            color: '#C9A84C', cursor: 'pointer',
            display: 'none', alignItems: 'center',
            justifyContent: 'center'
          }}>
          {menuOpen ? <X size={18}/> : <Menu size={18}/>}
        </button>
      </header>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div style={{
          position: 'fixed',
          top: '60px', left: 0, right: 0,
          background: 'rgba(10,8,28,0.99)',
          borderBottom: '1px solid rgba(201,168,76,0.2)',
          padding: '1rem',
          zIndex: 999,
          maxHeight: 'calc(100vh - 60px)',
          overflowY: 'auto',
          animation: 'slideDown 0.2s ease',
        }}>
          <style>{`
            @keyframes slideDown {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {user && (
            <div style={{
              padding: '10px 14px', marginBottom: '8px',
              background: 'rgba(201,168,76,0.06)',
              border: '1px solid rgba(201,168,76,0.15)',
              borderRadius: '10px'
            }}>
              <div style={{ color: '#E8C97A', fontSize: '14px', fontWeight: 700 }}>
                @{profile?.username || user.username}
              </div>
              <div style={{ color: '#7A6E5C', fontSize: '11px' }}>
                ⚡ {(profile?.total_xp ?? 0).toLocaleString()} XP
              </div>
            </div>
          )}

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '6px', marginBottom: '10px'
          }}>
            {NAV_ITEMS.map(item => {
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: '8px', padding: '10px 12px',
                    borderRadius: '9px', textDecoration: 'none',
                    fontSize: '13px', fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#C9A84C' : '#C4A882',
                    background: isActive ? 'rgba(201,168,76,0.12)' : 'rgba(28,22,56,0.5)',
                    border: isActive ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(255,255,255,0.04)',
                  }}>
                  <item.icon size={14} />
                  {t(item.key)}
                </Link>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" onClick={toggleLang}
              style={{
                padding: '8px 12px', borderRadius: '8px',
                background: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.25)',
                color: '#C9A84C', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
              }}>
              {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
            </button>
            {user && (
              <button onClick={async () => {
                const { signOut } = await import('@/lib/authClient')
                await signOut()
                window.location.href = '/login'
              }} style={{
                padding: '8px 12px', borderRadius: '8px',
                background: 'rgba(196,91,58,0.12)',
                border: '1px solid rgba(196,91,58,0.3)',
                color: '#E8A85C', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
              }}>
                {t('sign_out')}
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ height: '60px' }} />
    </>
  )
}
