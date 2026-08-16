'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'

const ENVIRONMENTAL_TIPS = [
  "🚯 Carry a reusable water bottle — plastic bottles are banned near most heritage sites",
  "🚶 Use public transport or walk when possible to reduce carbon footprint",
  "♻️ Dispose of waste properly in designated bins — never litter on monument grounds",
  "💧 Use eco-friendly sunscreen to protect ancient stone surfaces from chemical damage",
  "🌱 Support local tree-planting initiatives at heritage sites",
]

const CULTURAL_TIPS = [
  "👗 Dress modestly and respectfully — cover shoulders and knees when visiting religious sites",
  "📋 Follow all posted rules and guidelines — monuments are protected cultural heritage",
  "🤫 Be quiet and respectful — these are sacred spaces for many visitors",
  "🙏 Ask permission before photographing locals or religious ceremonies",
  "📖 Learn basic greetings in the local language — it shows respect and appreciation",
]

const PHOTOGRAPHY_TIPS = [
  "📵 Check photography rules — flash photography may be prohibited to protect ancient structures",
  "🚫 Respect 'No Photography' zones — some areas are restricted for conservation",
  "🤲 Don't touch or lean on monuments — oils from skin can damage delicate surfaces",
  "📱 Use natural light instead of flash to capture authentic colours of ancient art",
  "🖼️ Frame your shots thoughtfully — avoid selfie sticks that risk damaging monuments",
]

const SDG_BADGES = [
  { id: 'sdg11', label: 'SDG 11', title: 'Sustainable Cities & Communities', color: '#F99D26', icon: '🏙️' },
  { id: 'sdg17', label: 'SDG 17', title: 'Partnerships for the Goals', color: '#19486A', icon: '🤝' },
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
      setAiTips(data.answer)
    } catch {
      setAiTips('Could not load AI tips. Please try again.')
    } finally {
      setLoadingTips(false)
    }
  }

  return (
    <AppShell>
      <div className="p-4 lg:p-8 animate-fade-in">
        {/* Header */}
        <h1 className="font-serif text-3xl lg:text-4xl font-bold text-[#C9A84C] mb-2">
          🌿 Sustainable & Responsible Tourism
        </h1>
        <p style={{ color: '#C4A882', fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
          Protect India&apos;s heritage for future generations — follow these SDG-aligned sustainability guidelines
        </p>

        {/* Info banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(27,16,64,0.8), rgba(75,142,110,0.08))',
          border: '1px solid rgba(75,142,110,0.3)', borderRadius: 16, padding: '18px 24px', marginBottom: 28
        }}>
          <div style={{ color: '#7ECDC0', fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 600 }}>
            &quot;वसुधैव कुटुम्बकम्&quot; — The World is One Family
          </div>
          <div style={{ color: '#C4A882', fontSize: 13, marginTop: 6 }}>
            Responsible tourism preserves our shared heritage while supporting local communities
          </div>
        </div>

        {/* 3-column tip cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
          {/* Environmental */}
          <div style={{
            background: 'rgba(28,22,56,0.9)', border: '1px solid rgba(75,142,110,0.3)',
            borderRadius: 16, padding: 24
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🌱</div>
            <h3 style={{ color: '#7ECDC0', fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
              Environmental Tips
            </h3>
            {ENVIRONMENTAL_TIPS.map((tip, i) => (
              <div key={i} style={{
                color: '#C4A882', fontSize: 13, lineHeight: 1.7, padding: '8px 0',
                borderBottom: i < ENVIRONMENTAL_TIPS.length - 1 ? '1px solid rgba(201,168,76,0.1)' : 'none'
              }}>
                {tip}
              </div>
            ))}
          </div>

          {/* Cultural */}
          <div style={{
            background: 'rgba(28,22,56,0.9)', border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 16, padding: 24
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🏛️</div>
            <h3 style={{ color: '#E8C97A', fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
              Cultural Respect Tips
            </h3>
            {CULTURAL_TIPS.map((tip, i) => (
              <div key={i} style={{
                color: '#C4A882', fontSize: 13, lineHeight: 1.7, padding: '8px 0',
                borderBottom: i < CULTURAL_TIPS.length - 1 ? '1px solid rgba(201,168,76,0.1)' : 'none'
              }}>
                {tip}
              </div>
            ))}
          </div>

          {/* Photography */}
          <div style={{
            background: 'rgba(28,22,56,0.9)', border: '1px solid rgba(212,137,63,0.3)',
            borderRadius: 16, padding: 24
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📸</div>
            <h3 style={{ color: '#E8A85C', fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
              Responsible Photography
            </h3>
            {PHOTOGRAPHY_TIPS.map((tip, i) => (
              <div key={i} style={{
                color: '#C4A882', fontSize: 13, lineHeight: 1.7, padding: '8px 0',
                borderBottom: i < PHOTOGRAPHY_TIPS.length - 1 ? '1px solid rgba(201,168,76,0.1)' : 'none'
              }}>
                {tip}
              </div>
            ))}
          </div>
        </div>

        {/* Conservation quote */}
        <div style={{
          background: 'rgba(75,142,110,0.08)', border: '1px solid rgba(75,142,110,0.3)',
          borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 28
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>💚</div>
          <div style={{ color: '#7ECDC0', fontSize: 16, fontFamily: 'Georgia, serif', fontWeight: 600, lineHeight: 1.7 }}>
            &quot;Preserving India&apos;s monuments ensures that future generations can experience 5,000 years of living heritage, architecture, and culture.&quot;
          </div>
        </div>

        {/* SDG Badges */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
          {SDG_BADGES.map(sdg => (
            <div key={sdg.id} style={{
              background: `${sdg.color}20`, border: `1px solid ${sdg.color}60`,
              borderRadius: 12, padding: '16px 24px', textAlign: 'center', minWidth: 180
            }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{sdg.icon}</div>
              <div style={{ color: sdg.color, fontWeight: 700, fontSize: 14 }}>{sdg.label}</div>
              <div style={{ color: '#C4A882', fontSize: 12, marginTop: 4 }}>{sdg.title}</div>
            </div>
          ))}
        </div>

        {/* AI Tips section */}
        <div style={{
          background: 'rgba(28,22,56,0.9)', border: '1px solid rgba(201,168,76,0.3)',
          borderRadius: 16, padding: 24, textAlign: 'center'
        }}>
          <h3 style={{ color: '#C9A84C', fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
            🤖 Get AI-Powered Sustainability Tips
          </h3>
          <p style={{ color: '#C4A882', fontSize: 13, marginBottom: 16 }}>
            Ask our AI for personalized sustainability recommendations
          </p>
          <button onClick={getAiTips} disabled={loadingTips} style={{
            padding: '12px 32px', borderRadius: 10,
            background: 'linear-gradient(135deg, #4B9B8E, #2D6B61)',
            color: 'white', border: 'none', cursor: loadingTips ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 700, opacity: loadingTips ? 0.6 : 1
          }}>
            {loadingTips ? '⏳ Loading...' : '🌿 Get AI Tips'}
          </button>
          {aiTips && (
            <div style={{
              marginTop: 16, textAlign: 'left',
              background: 'rgba(75,142,110,0.08)', border: '1px solid rgba(75,142,110,0.3)',
              borderRadius: 12, padding: 16, color: '#C4A882', fontSize: 14, lineHeight: 1.8,
              whiteSpace: 'pre-wrap'
            }}>
              {aiTips}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
