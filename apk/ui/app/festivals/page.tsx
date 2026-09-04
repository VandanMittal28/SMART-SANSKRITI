'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { ChevronDown } from 'lucide-react'
import { useLang } from '@/lib/languageContext'
import { cn } from '@/lib/utils'

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
  if (days === 0) return { className: 'border-[#DC2626]/50 bg-[#DC2626]/15 text-[#F87171]', label: 'Today' }
  if (days <= 7) return { className: 'border-[#D6A84B]/50 bg-[#D6A84B]/15 text-[#E8BE69]', label: `${days} days` }
  if (days <= 30) return { className: 'border-[#D6A84B]/25 bg-[#D6A84B]/8 text-[#D6A84B]', label: `${days} days` }
  return { className: 'border-white/10 bg-white/[0.04] text-[#8891A6]', label: `${days} days` }
}

function typeColor(t: string) {
  const map: Record<string, string> = {
    'National': '#63C7BA', 'Religious': '#D6A84B', 'Cultural': '#C66B4E', 'Religious & Cultural': '#D6A84B', 'Cultural & Trade': '#AE8A5E'
  }
  return map[t] || '#AEB6C8'
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
      <div className="screen-gutter flex flex-col gap-5 py-5 animate-fade-in">
        <section>
          <h1 className="font-heritage text-2xl font-bold text-[#F6F1E8]">{t('festival_header')}</h1>
          <p className="mt-1 text-sm text-[#AEB6C8]">{FESTIVALS.length} cultural events at India&apos;s most iconic monuments</p>
        </section>

        <section className="rounded-2xl border border-[#D6A84B]/22 bg-[#D6A84B]/[0.06] p-4">
          <p className="font-heritage text-sm font-semibold text-[#E8BE69]">{t('festival_subtitle')}</p>
          <p className="mt-1 text-xs text-[#AEB6C8]">30+ festivals with historical context, visitor tips, and monument connections</p>
        </section>

        <div className="app-scroll-row -mx-5 flex gap-2 overflow-x-auto px-5" role="tablist" aria-label="Filter by festival type">
          {allTypes.map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              role="tab"
              aria-selected={filter === type}
              className={cn(
                'shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors',
                filter === type ? 'border-[#D6A84B] bg-[#D6A84B]/15 text-[#D6A84B]' : 'border-white/10 text-[#8891A6]',
              )}
            >
              {type}
            </button>
          ))}
        </div>

        <p className="text-xs text-[#8891A6]">Showing {filtered.length} festivals — sorted by next occurrence</p>

        <div className="flex flex-col gap-2.5" aria-label="Festival list">
          {filtered.map(fest => {
            const badge = daysBadgeColor(fest.days)
            const isExpanded = expanded === fest.name

            return (
              <div key={fest.name} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#11182B]">
                <button
                  onClick={() => setExpanded(isExpanded ? null : fest.name)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span className="text-2xl" aria-hidden>{fest.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#F6F1E8]">{fest.name}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ background: `${typeColor(fest.type)}20`, color: typeColor(fest.type) }}
                      >
                        {fest.type}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#8891A6]">{fest.location} · {MONTH_NAMES[fest.month]} {fest.day} · {fest.duration}</p>
                  </div>
                  <span className={cn('shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold whitespace-nowrap', badge.className)}>
                    {badge.label}
                  </span>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-[#8891A6] transition-transform', isExpanded && 'rotate-180')} />
                </button>

                {isExpanded && (
                  <div className="border-t border-white/[0.05] px-4 pb-4">
                    <p className="mt-3.5 text-sm font-semibold leading-6 text-[#E8BE69]">{fest.significance}</p>

                    <div className="mt-2.5 rounded-r-lg border-l-2 border-[#D6A84B]/40 bg-white/[0.02] py-2.5 pl-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8891A6]">{t('historical_context')}</p>
                      <p className="mt-1 text-xs leading-5 text-[#AEB6C8]">{fest.historical_context}</p>
                    </div>

                    <div className="mt-2.5 rounded-lg border border-[#63C7BA]/25 bg-[#63C7BA]/[0.06] px-3.5 py-2.5">
                      <span className="text-xs font-bold text-[#8DE0D6]">{t('visitor_tip')} </span>
                      <span className="text-xs text-[#AEB6C8]">{fest.visitor_tip}</span>
                    </div>

                    {fest.monuments.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {fest.monuments.map(m => (
                          <span key={m} className="rounded-full border border-[#D6A84B]/25 bg-[#D6A84B]/[0.08] px-2.5 py-1 text-[10px] font-semibold text-[#E8BE69]">
                            {m}
                          </span>
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
