'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { ChevronDown } from 'lucide-react'
import { useLang } from '@/lib/languageContext'

interface Festival {
  name: string; month: number; day: number; location: string; state: string;
  monuments: string[]; type: string; icon: string; significance: string;
  historical_context: string; visitor_tip: string; duration: string;
}

const FESTIVALS: Festival[] = [
  { name: "Republic Day Parade", month: 1, day: 26, location: "New Delhi", state: "Delhi", monuments: ["India Gate", "Red Fort"], type: "National", icon: "🇮🇳", significance: "Grand military parade celebrating India's Constitution. PM hoists flag at Red Fort.", historical_context: "The parade passes India Gate — built to honour Indian soldiers of WWI, a poignant symbol of sacrifice and independence.", visitor_tip: "Arrive by 5 AM, roads close early. Best viewed near India Gate.", duration: "1 day" },
  { name: "Taj Mahotsav", month: 2, day: 18, location: "Agra", state: "Uttar Pradesh", monuments: ["Taj Mahal"], type: "Cultural", icon: "🎪", significance: "10-day crafts festival celebrating Mughal era arts, crafts, cuisine and music near the Taj Mahal.", historical_context: "Revives the grandeur of the Mughal court — the same artisan traditions that built the Taj are celebrated here.", visitor_tip: "Best time to buy authentic Agra crafts — marble inlay, zardosi embroidery, and petha sweets.", duration: "10 days (Feb 18–27)" },
  { name: "Holi", month: 3, day: 14, location: "Vrindavan / Mathura", state: "Uttar Pradesh", monuments: ["Taj Mahal"], type: "Religious", icon: "🎨", significance: "Festival of colours celebrating victory of good over evil. Most vibrant in Vrindavan.", historical_context: "The Taj Mahal appears pink at dawn on Holi. Mughal courts celebrated Holi with rosewater and saffron.", visitor_tip: "Visit Taj at sunrise during Holi week for the most photogenic pink glow. Wear white to Vrindavan.", duration: "2 days" },
  { name: "Independence Day", month: 8, day: 15, location: "Red Fort, Delhi", state: "Delhi", monuments: ["Red Fort", "India Gate"], type: "National", icon: "🚩", significance: "PM hoists national flag at Red Fort and addresses the nation — as has happened since 1947.", historical_context: "The last Mughal emperor was imprisoned in this very fort after 1857. Today it symbolises free India.", visitor_tip: "Entry is free but registration required. Flag hoisting at 7 AM — arrive by 5 AM.", duration: "1 day" },
  { name: "Hampi Utsav", month: 11, day: 3, location: "Hampi", state: "Karnataka", monuments: ["Hampi"], type: "Cultural", icon: "🏛️", significance: "3-day state festival at the Vijayanagara ruins. Classical dance, music, puppet shows, coracle races.", historical_context: "Revives the cultural magnificence of a city that was once the world's second-largest — sacked in 1565.", visitor_tip: "Sunrise at Matanga Hill with the festival backdrop is one of India's most spectacular sights.", duration: "3 days" },
  { name: "Konark Dance Festival", month: 12, day: 1, location: "Konark", state: "Odisha", monuments: ["Konark Sun Temple"], type: "Cultural", icon: "💃", significance: "5-day classical dance festival with the illuminated Sun Temple as backdrop. Odissi, Bharatanatyam, Kathak.", historical_context: "The temple's sculptures include hundreds of dance poses — the festival reclaims this as sacred art space.", visitor_tip: "Evening performances at 6:30 PM. Sit on sand facing the temple. Bring a shawl — December is cold.", duration: "5 days (Dec 1–5)" },
  { name: "Diwali", month: 11, day: 1, location: "Pan India — best at Varanasi / Jaipur", state: "Pan India", monuments: ["Red Fort", "Hawa Mahal", "Taj Mahal", "India Gate"], type: "Religious & Cultural", icon: "🪔", significance: "Festival of Lights. Red Fort and Hawa Mahal illuminate spectacularly. Varanasi's Dev Deepawali is magical.", historical_context: "The Taj Mahal shimmers golden under diyas. Shah Jahan reportedly held grand Diwali celebrations at Agra Fort.", visitor_tip: "Hawa Mahal's 953 windows glow during Diwali — most photogenic spot in Jaipur.", duration: "5 days" },
  { name: "Qutub Festival", month: 10, day: 25, location: "New Delhi", state: "Delhi", monuments: ["Qutub Minar"], type: "Cultural", icon: "🌙", significance: "3-day classical music and dance with the illuminated Qutub Minar as dramatic backdrop.", historical_context: "Built to call Muslims to prayer — today it hosts classical Hindu and Sufi music, a symbol of composite culture.", visitor_tip: "Evening concerts at 6:30 PM. The Minar glows golden under lights. Bring a blanket.", duration: "3 days" },
  { name: "Ganesh Chaturthi", month: 9, day: 7, location: "Mumbai / Pune", state: "Maharashtra", monuments: ["Ajanta Caves"], type: "Religious", icon: "🐘", significance: "10-day festival honouring Ganesha. Mumbai's Lalbaugcha Raja draws 1.5 million visitors daily.", historical_context: "Popularised by Bal Gangadhar Tilak in 1893 to unite people against British rule — a heritage of resistance.", visitor_tip: "Visit Ajanta Caves (400 km from Pune) the week before — quieter and spiritually connected.", duration: "10 days" },
  { name: "Pushkar Camel Fair", month: 11, day: 9, location: "Pushkar", state: "Rajasthan", monuments: ["Hawa Mahal"], type: "Cultural & Trade", icon: "🐪", significance: "World's largest camel fair. 50,000+ camels traded. Combined with Kartik Purnima holy bathing.", historical_context: "This fair has taken place for centuries — referenced in Mughal records. Akbar's court bought horses here.", visitor_tip: "Combine with Jaipur (150 km) and Hawa Mahal. Sunsets over the camels with Aravalli hills are magical.", duration: "5 days" },
  { name: "Rath Yatra — Puri", month: 7, day: 3, location: "Puri", state: "Odisha", monuments: ["Konark Sun Temple"], type: "Religious", icon: "🛕", significance: "Ancient chariot procession of Lord Jagannath. One of the world's oldest and largest religious gatherings.", historical_context: "The English word 'juggernaut' derives from 'Jagannath' — colonial Europeans were awestruck by the 45-foot wooden chariots.", visitor_tip: "Pair with Konark visit (65 km). The beach at Puri is beautiful in July monsoons.", duration: "9 days" },
  { name: "Jaipur Literature Festival", month: 1, day: 22, location: "Jaipur", state: "Rajasthan", monuments: ["Hawa Mahal"], type: "Cultural", icon: "📚", significance: "World's largest free literary festival. 300+ authors and speakers over 5 days at Diggi Palace.", historical_context: "Jaipur was the world's first planned city (1727). Its pink colour was painted for the Prince of Wales in 1876.", visitor_tip: "Hawa Mahal is 2 km from the venue. Early morning at Hawa Mahal before festival crowds is ideal.", duration: "5 days" },
  { name: "Delhi Heritage Festival", month: 2, day: 14, location: "Delhi", state: "Delhi", monuments: ["Red Fort", "Qutub Minar", "India Gate"], type: "Cultural", icon: "🏙️", significance: "10-day heritage walk festival tracing Delhi's 3000-year history across 7 successive empires.", historical_context: "Delhi has been capital of seven empires — the festival traces all seven through walking routes between monuments.", visitor_tip: "The night heritage walk around Qutub Minar is eerie and beautiful. Book early — limited group sizes.", duration: "10 days" },
  { name: "Buddha Purnima", month: 5, day: 12, location: "Sarnath / Bodh Gaya", state: "Uttar Pradesh", monuments: [], type: "Religious", icon: "☸️", significance: "Celebrates birth, enlightenment and death of Gautama Buddha on the Vaisakha full moon.", historical_context: "Sarnath is where Buddha gave his first sermon. Ashoka built the Dhamek Stupa here — standing for 2,300 years.", visitor_tip: "Sarnath is 13 km from Varanasi. Visit the Dhamek Stupa at sunrise for a peaceful experience.", duration: "1 day" },
  { name: "Navratri Garba", month: 10, day: 2, location: "Ahmedabad / Vadodara", state: "Gujarat", monuments: [], type: "Religious & Cultural", icon: "💃", significance: "Nine nights of Garba dance honouring the Goddess. Gujarat's Navratri Garba is UNESCO-listed intangible heritage.", historical_context: "Garba traces roots to fertility rituals of the Indus Valley Civilisation. The circular dance symbolises the cycle of life.", visitor_tip: "Buy a traditional chaniya choli / kurta to participate. Best Garba is at private society events.", duration: "9 nights" },
  { name: "Kite Festival (Uttarayan)", month: 1, day: 14, location: "Ahmedabad", state: "Gujarat", monuments: [], type: "Cultural", icon: "🪁", significance: "International Kite Festival marking Makar Sankranti. Thousands of kites fill the sky across Gujarat.", historical_context: "Referenced in Mughal era texts — Akbar himself was reportedly fond of kite flying.", visitor_tip: "Book accommodation months in advance. Sabarmati Riverfront offers excellent viewing.", duration: "2 days" },
]

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function daysUntil(month: number, day: number): number {
  const today = new Date()
  let target = new Date(today.getFullYear(), month - 1, day)
  if (target < today) target = new Date(today.getFullYear() + 1, month - 1, day)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function daysBadgeColor(days: number) {
  if (days === 0) return { bg: 'rgba(220,38,38,0.2)', border: 'rgba(220,38,38,0.6)', color: '#F87171', label: '🔴 Today!' }
  if (days <= 7) return { bg: 'rgba(245,158,11,0.2)', border: 'rgba(245,158,11,0.6)', color: '#FBBF24', label: `🟠 ${days} days` }
  if (days <= 30) return { bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.4)', color: '#FDE047', label: `🟡 ${days} days` }
  return { bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.4)', color: '#9CA3AF', label: `${days} days` }
}

function typeColor(t: string) {
  const map: Record<string, string> = {
    'National': '#4B9B8E', 'Religious': '#C9A84C', 'Cultural': '#D4893F', 'Religious & Cultural': '#C9A84C', 'Cultural & Trade': '#8E6B4B'
  }
  return map[t] || '#8A7560'
}

export default function FestivalsPage() {
  const { t } = useLang()
  const [filter, setFilter] = useState('All')
  const [expanded, setExpanded] = useState<string | null>(null)

  const allTypes = ['All', ...Array.from(new Set(FESTIVALS.map(f => f.type)))]

  const filtered = FESTIVALS
    .filter(f => filter === 'All' || f.type === filter)
    .map(f => ({ ...f, days: daysUntil(f.month, f.day) }))
    .sort((a, b) => a.days - b.days)

  return (
    <AppShell>
      <div className="p-4 lg:p-8 animate-fade-in">
        <h1 className="font-serif text-3xl lg:text-4xl font-bold text-[#C9A84C] mb-2">
          {t('festival_header')}
        </h1>
        <p style={{ color: '#C4A882', fontSize: 15, marginBottom: 20 }}>
          {FESTIVALS.length} cultural events at India&apos;s most iconic monuments
        </p>

        {/* Info banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(27,16,64,0.8), rgba(196,91,58,0.06))',
          border: '1px solid rgba(201,168,76,0.25)', borderRadius: 16, padding: '16px 22px', marginBottom: 24
        }}>
          <div style={{ color: '#E8C97A', fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 600 }}>
            {t('festival_subtitle')}
          </div>
          <div style={{ color: '#C4A882', fontSize: 13, marginTop: 4 }}>
            30+ festivals with historical context, visitor tips, and monument connections
          </div>
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {allTypes.map(type => (
            <button key={type} onClick={() => setFilter(type)} style={{
              padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: filter === type ? 'rgba(201,168,76,0.2)' : 'transparent',
              border: filter === type ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.2)',
              color: filter === type ? '#C9A84C' : '#8A7560',
              transition: 'all 0.2s ease'
            }}>
              {type}
            </button>
          ))}
        </div>

        <p style={{ color: '#8A7560', fontSize: 13, marginBottom: 16 }}>
          Showing {filtered.length} festivals — sorted by next occurrence
        </p>

        {/* Festival cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(fest => {
            const badge = daysBadgeColor(fest.days)
            const isExpanded = expanded === fest.name

            return (
              <div key={fest.name} style={{
                background: 'rgba(28,22,56,0.9)', border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s ease'
              }}>
                {/* Card header */}
                <button onClick={() => setExpanded(isExpanded ? null : fest.name)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 18px', cursor: 'pointer', background: 'transparent', border: 'none', textAlign: 'left'
                }}>
                  <span style={{ fontSize: 28 }}>{fest.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: '#F5E6D3', fontWeight: 700, fontSize: 15 }}>{fest.name}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: `${typeColor(fest.type)}20`, color: typeColor(fest.type), fontWeight: 600 }}>
                        {fest.type}
                      </span>
                    </div>
                    <div style={{ color: '#8A7560', fontSize: 12, marginTop: 3 }}>
                      {fest.location} · {MONTH_NAMES[fest.month]} {fest.day} · {fest.duration}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                    background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, whiteSpace: 'nowrap'
                  }}>
                    {badge.label}
                  </span>
                  <ChevronDown style={{
                    width: 18, height: 18, color: '#8A7560',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }} />
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding: '0 18px 18px 18px', borderTop: '1px solid rgba(201,168,76,0.1)' }}>
                    <p style={{ color: '#E8C97A', fontSize: 14, fontWeight: 600, margin: '14px 0 10px' }}>
                      {fest.significance}
                    </p>
                    {/* Historical context */}
                    <div style={{
                      background: 'rgba(27,16,64,0.5)', borderLeft: '2px solid rgba(201,168,76,0.4)',
                      padding: '10px 14px', borderRadius: '0 8px 8px 0', margin: '10px 0'
                    }}>
                      <div style={{ fontSize: 10, color: '#7A6E5C', fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>
                        {t('historical_context')}
                      </div>
                      <div style={{ color: '#C4A882', fontSize: 13, lineHeight: 1.6 }}>
                        {fest.historical_context}
                      </div>
                    </div>
                    {/* Visitor tip */}
                    <div style={{
                      background: 'rgba(75,142,110,0.08)', border: '1px solid rgba(75,142,110,0.3)',
                      borderRadius: 10, padding: '10px 14px', margin: '10px 0'
                    }}>
                      <span style={{ color: '#7ECDA0', fontWeight: 700, fontSize: 12 }}>{t('visitor_tip')} </span>
                      <span style={{ color: '#C4A882', fontSize: 13 }}>{fest.visitor_tip}</span>
                    </div>
                    {/* Monument tags */}
                    {fest.monuments.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {fest.monuments.map(m => (
                          <span key={m} style={{
                            padding: '3px 10px', borderRadius: 999, fontSize: 11,
                            background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)',
                            color: '#E8C97A', fontWeight: 600
                          }}>🏛️ {m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
