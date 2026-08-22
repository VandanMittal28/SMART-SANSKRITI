'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/authContext'

type BadgeId = 'first_steps' | 'explorer' | 'quiz_master' | 'hunter' | 'day_tripper'

type Badge = {
  id: BadgeId
  title: string
  icon: string
  hint: string
  xpRequired: number
}

const BADGES: Badge[] = [
  { id: 'first_steps', title: 'First Steps', icon: '👣', hint: 'Earn 25 XP by checking in to a zone.', xpRequired: 25 },
  { id: 'explorer', title: 'Explorer', icon: '🧭', hint: 'Earn 100 XP by visiting monuments.', xpRequired: 100 },
  { id: 'quiz_master', title: 'Quiz Master', icon: '🧠', hint: 'Earn 200 XP by answering quiz questions.', xpRequired: 200 },
  { id: 'hunter', title: 'Hunter', icon: '🏹', hint: 'Earn 500 XP by completing the treasure hunt.', xpRequired: 500 },
  { id: 'day_tripper', title: 'Day Tripper', icon: '🧳', hint: 'Earn 1000 XP through exploration.', xpRequired: 1000 },
]

const MAX_XP = 1000

function unlockBadges(totalXp: number): BadgeId[] {
  return BADGES.filter(b => totalXp >= b.xpRequired).map(b => b.id)
}

export default function AchievementsPage() {
  const router = useRouter()
  const { profile, loading } = useAuth()

  const totalXp = profile?.total_xp || 0
  const earned = unlockBadges(totalXp)
  const xpPct = Math.min(100, Math.round((totalXp / MAX_XP) * 100))
  const monumentsVisited = (profile?.monuments_visited || []).length

  return (
    <div style={{ minHeight: '100vh', background: '#0F0B1E' }}>
      <style>{`
        @keyframes goldGlow { 0%,100%{box-shadow:0 0 12px rgba(201,168,76,0.4)} 50%{box-shadow:0 0 24px rgba(201,168,76,0.8)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* Header */}
      <div style={{ background: '#1A1035', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#C9A84C', fontSize: '24px', cursor: 'pointer', padding: '8px' }}>←</button>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#C9A84C', fontFamily: 'Georgia, serif' }}>Achievements</h1>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
            <div style={{ width: 40, height: 40, border: '4px solid rgba(201,168,76,0.2)', borderTop: '4px solid #C9A84C', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {/* User info card */}
        {!loading && profile && (
          <div style={{ background: 'rgba(75,155,142,0.1)', border: '1px solid rgba(75,155,142,0.4)', borderRadius: 14, padding: 18, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: '#4B9B8E', fontWeight: 700, fontSize: 16 }}>👤 {profile.full_name || 'Explorer'}</div>
              <div style={{ color: '#C4A882', fontSize: 13, marginTop: 4 }}>🏛️ {monumentsVisited} monument{monumentsVisited !== 1 ? 's' : ''} visited</div>
            </div>
            <div style={{ color: '#C9A84C', fontWeight: 800, fontSize: 22 }}>⚡ {totalXp} XP</div>
          </div>
        )}

        {/* XP Card */}
        {!loading && (
          <div style={{ background: 'rgba(28,22,56,0.9)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ color: '#C4A882', fontSize: 14 }}>Total XP</span>
              <span style={{ color: '#C9A84C', fontWeight: 800, fontSize: 22 }}>⚡ {totalXp} XP</span>
            </div>
            <div style={{ height: 12, background: '#1C1638', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${xpPct}%`, background: 'linear-gradient(90deg, #C9A84C, #D4893F)', borderRadius: 999, transition: 'width 1s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ color: '#C4A882', fontSize: 12 }}>0 XP</span>
              <span style={{ color: '#C9A84C', fontSize: 12, fontWeight: 600 }}>{xpPct}%</span>
              <span style={{ color: '#C4A882', fontSize: 12 }}>{MAX_XP} XP</span>
            </div>
          </div>
        )}

        {/* Badges grid */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {BADGES.map((badge) => {
              const isEarned = earned.includes(badge.id)
              return (
                <div
                  key={badge.id}
                  style={{
                    background: isEarned ? 'rgba(201,168,76,0.08)' : 'rgba(28,22,56,0.7)',
                    border: isEarned ? '2px solid rgba(201,168,76,0.6)' : '2px solid rgba(201,168,76,0.15)',
                    borderRadius: 14, padding: 18,
                    display: 'flex', gap: 14, alignItems: 'flex-start',
                    animation: isEarned ? 'goldGlow 2.5s ease-in-out infinite' : 'none',
                    transition: 'all 0.3s',
                  }}
                >
                  <div style={{ fontSize: 36, lineHeight: 1 }}>{isEarned ? badge.icon : '🔒'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 800, color: isEarned ? '#C9A84C' : '#6B7280', fontSize: 15 }}>{badge.title}</div>
                      {isEarned ? (
                        <div style={{ background: 'rgba(75,155,142,0.2)', color: '#4B9B8E', border: '1px solid #4B9B8E', fontWeight: 700, padding: '3px 10px', borderRadius: 999, fontSize: 11 }}>✅ Earned</div>
                      ) : (
                        <div style={{ background: 'rgba(28,22,56,0.8)', color: '#6B7280', border: '1px solid rgba(107,114,128,0.3)', fontWeight: 700, padding: '3px 10px', borderRadius: 999, fontSize: 11 }}>🔒 Locked</div>
                      )}
                    </div>
                    <div style={{ marginTop: 6, color: isEarned ? '#C4A882' : '#6B7280', fontSize: 13, lineHeight: 1.4 }}>
                      {isEarned ? `🎉 Nice work! Keep exploring.` : badge.hint}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: '#534AB7' }}>Requires {badge.xpRequired} XP</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
