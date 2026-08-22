'use client'
import { useState } from 'react'
import { PanoramaViewer } from './panorama-viewer'

// Monument data from SANSKRITI-AI-main/data/monuments.json
const MONUMENT_DATA: Record<string, {
  built_by: string; year_built: string; location: string; state: string; type: string;
  cultural_importance: string; architecture: string; key_facts: string[];
  fun_fact: string; best_time_to_visit: string; entry_fee: string;
  unesco?: boolean; seven_wonders?: boolean;
}> = {
  "Taj Mahal": {
    built_by: "Mughal Emperor Shah Jahan", year_built: "1632–1653", location: "Agra", state: "Uttar Pradesh", type: "Mausoleum",
    cultural_importance: "Built as an eternal symbol of love for Mumtaz Mahal. Visited by 7–8 million tourists annually.",
    architecture: "Mughal architecture blending Persian, Islamic and Indian styles. 28 types of precious stones inlaid in white marble.",
    key_facts: ["Took 22 years and 20,000 artisans to build", "The minarets lean slightly outward to protect the tomb if they fall", "Changes colour — pink at dawn, white at noon, golden at moonlight", "The gardens follow the Persian Charbagh style"],
    fun_fact: "Shah Jahan planned a black marble Taj Mahal for himself across the river, but was imprisoned by his son Aurangzeb before it could be built.",
    best_time_to_visit: "October to March", entry_fee: "₹50 Indians, ₹1100 foreigners", unesco: true, seven_wonders: true
  },
  "Red Fort": {
    built_by: "Mughal Emperor Shah Jahan", year_built: "1638–1648", location: "Delhi", state: "Delhi", type: "Fort-Palace",
    cultural_importance: "India's Independence Day is celebrated here every August 15. The PM hoists the flag from its ramparts.",
    architecture: "Mughal architecture in red sandstone and white marble. Blend of Persian, Timurid and Hindu styles.",
    key_facts: ["Walls are 2.4 km long and up to 33m high", "Originally had a stream of water (Nahr-i-Bihisht) flowing through every room", "The Kohinoor diamond and Peacock Throne were kept here", "British used it as military garrison after 1857 revolt"],
    fun_fact: "The fort was originally white — it was painted red by the British to hide deterioration.",
    best_time_to_visit: "October to March", entry_fee: "₹35 Indians, ₹500 foreigners", unesco: true
  },
  "Qutub Minar": {
    built_by: "Qutb ud-Din Aibak (started), Iltutmish (completed)", year_built: "1193–1220", location: "Delhi", state: "Delhi", type: "Victory Tower",
    cultural_importance: "Built to celebrate Muslim dominance in Delhi after defeat of last Hindu kingdom. World's tallest brick minaret.",
    architecture: "Indo-Islamic with intricate Arabic and Nagari inscriptions. Fluted red sandstone and marble.",
    key_facts: ["72.5 metres tall with 379 steps", "Has a 2,300-year-old iron pillar nearby that has never rusted", "Tilts 25 inches from vertical", "Originally had 5 storeys; top was rebuilt after lightning damage"],
    fun_fact: "The nearby Iron Pillar of Delhi (1,600+ years old) hasn't rusted because of its unusually high phosphorus content — a mystery that baffled scientists for centuries.",
    best_time_to_visit: "October to March", entry_fee: "₹35 Indians, ₹550 foreigners", unesco: true
  },
  "Gateway of India": {
    built_by: "British Government (George Wittet)", year_built: "1924", location: "Mumbai", state: "Maharashtra", type: "Triumphal Arch",
    cultural_importance: "Built to commemorate King George V's visit. Ironically, the last British troops departed through it in 1948.",
    architecture: "Indo-Saracenic style with blend of Hindu and Muslim motifs. Built in yellow basalt and concrete.",
    key_facts: ["26 metres tall", "Built to welcome King George V in 1911", "The last British troops left India through this gateway in 1948", "Overlooks the Arabian Sea at Apollo Bunder"],
    fun_fact: "The Gateway was actually built AFTER King George V visited — he only saw a cardboard model during his visit in 1911.",
    best_time_to_visit: "October to March", entry_fee: "Free"
  },
  "Hampi": {
    built_by: "Vijayanagara Empire (Hakka and Bukka founders)", year_built: "1336–1565", location: "Hampi", state: "Karnataka", type: "Ruined City",
    cultural_importance: "Once one of the largest and richest cities in the world. At its peak, it was larger than Rome with a population of 500,000.",
    architecture: "Dravidian-Vijayanagara architecture amid a surreal boulder-strewn landscape. Stone chariot, musical pillars and massive gopurams.",
    key_facts: ["Was the world's 2nd largest city in 1500 CE after Beijing", "Destroyed in 1565 by an alliance of Deccan sultanates", "The stone chariot at Vittala temple is on the new ₹50 note", "Has over 1,600 monuments spread across 26 sq km"],
    fun_fact: "The boulders surrounding Hampi are over 3 billion years old — among the oldest exposed rock formations on Earth.",
    best_time_to_visit: "October to March", entry_fee: "₹40 Indians, ₹600 foreigners", unesco: true
  },
  "Golden Temple Amritsar": {
    built_by: "Guru Arjan Dev (5th Sikh Guru)", year_built: "1604", location: "Amritsar", state: "Punjab", type: "Gurdwara",
    cultural_importance: "Holiest Gurdwara of Sikhism. Feeds over 50,000 people free meals daily in the world's largest community kitchen (Langar).",
    architecture: "Blend of Hindu and Islamic styles. Upper floors covered in 750 kg of pure gold. White marble lower level with inlaid pietra dura.",
    key_facts: ["Covered in 750 kg of pure gold", "Feeds 50,000+ people daily for free", "Has doors on all 4 sides symbolising openness to all", "The Amrit Sarovar pool is believed to have healing properties"],
    fun_fact: "The temple serves over 100,000 rotis and 20,000 kg of dal daily — making it the world's largest free kitchen.",
    best_time_to_visit: "October to March", entry_fee: "Free"
  },
  "Kedarnath Temple": {
    built_by: "Adi Shankaracharya (current structure)", year_built: "8th century CE", location: "Kedarnath", state: "Uttarakhand", type: "Temple",
    cultural_importance: "One of the 12 Jyotirlingas and part of the Char Dham pilgrimage. Sits at 3,583m altitude near a glacier.",
    architecture: "Large platform of stone slabs with a conical shikhara. Built entirely of grey stone without mortar at extreme altitude.",
    key_facts: ["Located at 3,583m altitude", "One of the 12 Jyotirlingas", "Survived the devastating 2013 floods", "Only accessible by 16 km trek from Gaurikund"],
    fun_fact: "During the 2013 floods that destroyed the entire town, a massive boulder stopped just behind the temple, diverting the floodwaters around it.",
    best_time_to_visit: "May to October", entry_fee: "Free"
  },
  "Meenakshi Amman Temple": {
    built_by: "Nayak dynasty (rebuilt by Thirumalai Nayak)", year_built: "6th century CE onwards", location: "Madurai", state: "Tamil Nadu", type: "Temple",
    cultural_importance: "One of India's most important Hindu temples. Has 14 magnificent gopurams covered in thousands of painted stucco figures.",
    architecture: "Dravidian architecture with 14 gate towers (gopurams) covered in 33,000 painted sculptures.",
    key_facts: ["Has 33,000 painted sculptures on its gopurams", "14 towering gopurams, tallest at 52m", "Named after the fish-shaped eyes of Goddess Meenakshi", "The temple complex covers 14 acres"],
    fun_fact: "The temple has a Hall of 1,000 Pillars — and if you tap each pillar, it produces a different musical note.",
    best_time_to_visit: "October to March", entry_fee: "Free"
  },
  "Mysore Palace": {
    built_by: "British architect Henry Irwin for Wadiyar dynasty", year_built: "1912", location: "Mysore", state: "Karnataka", type: "Palace",
    cultural_importance: "Former seat of the Wadiyar dynasty. Most visited monument in India after the Taj Mahal with 6 million annual visitors.",
    architecture: "Indo-Saracenic style blending Hindu, Muslim, Rajput and Gothic elements. Decorated with stained glass and gold leaf.",
    key_facts: ["Illuminated with 97,000 light bulbs during Dasara", "Most visited monument in India after Taj Mahal", "Has rooms decorated with 22-carat gold ceilings", "The original wooden palace was burned down in 1897"],
    fun_fact: "During the Dasara festival, the palace is lit with 97,000 light bulbs — and the sight is so spectacular it's visible from space.",
    best_time_to_visit: "October (Dasara)", entry_fee: "₹70 Indians, ₹200 foreigners"
  },
  "Hawa Mahal Jaipur": {
    built_by: "Maharaja Sawai Pratap Singh", year_built: "1799", location: "Jaipur", state: "Rajasthan", type: "Palace",
    cultural_importance: "Built so royal women could observe street life without being seen. The iconic pink honeycomb facade has 953 windows.",
    architecture: "Rajput architecture. 5 storeys, 953 windows (jharokhas) with intricate latticework. Only 1 room thick in places.",
    key_facts: ["953 small windows create a 'honeycomb' facade", "Only one room deep — essentially a facade", "Built for royal women to watch processions unseen", "The structure has no front entrance — you enter from the back"],
    fun_fact: "The palace acts as a natural air conditioner — the 953 windows create a wind effect that keeps the interior cool even in Jaipur's extreme heat.",
    best_time_to_visit: "October to March", entry_fee: "₹50 Indians, ₹200 foreigners"
  },
  "Charminar Hyderabad": {
    built_by: "Muhammad Quli Qutb Shah", year_built: "1591", location: "Hyderabad", state: "Telangana", type: "Monument",
    cultural_importance: "Built to commemorate the eradication of plague. Iconic symbol of Hyderabad at the heart of the Old City.",
    architecture: "Indo-Islamic architecture with 4 minarets (56m each), pointed arches and stucco ornamentation.",
    key_facts: ["Each minaret is 56 metres tall", "Has a mosque on the top floor — one of the oldest in India", "Built to mark the founding of Hyderabad", "Originally had underground tunnels connecting to Golconda Fort"],
    fun_fact: "Legend says a secret tunnel connects Charminar to Golconda Fort (8 km away) — but no one has found it despite many searches.",
    best_time_to_visit: "October to March", entry_fee: "₹25 Indians, ₹300 foreigners"
  },
  "Victoria Memorial Kolkata": {
    built_by: "British Government (William Emerson)", year_built: "1906–1921", location: "Kolkata", state: "West Bengal", type: "Memorial & Museum",
    cultural_importance: "Now a museum, it houses 28,394 artefacts including rare paintings and manuscripts of the colonial era.",
    architecture: "Indo-Saracenic with Mughal elements. Built in white Makrana marble (same as Taj Mahal). 103m × 69m.",
    key_facts: ["Built with the same Makrana marble as the Taj Mahal", "Houses 28,394 artefacts", "Has a 4.9m bronze Angel of Victory on top that rotates with the wind", "Took 15 years to complete"],
    fun_fact: "The bronze Angel of Victory on top acts as a weathervane — it rotates with the wind.",
    best_time_to_visit: "October to March", entry_fee: "₹30 Indians, ₹500 foreigners"
  },
  "Ajanta Caves": {
    built_by: "Buddhist monks (various dynasties)", year_built: "2nd century BCE – 6th century CE", location: "Aurangabad", state: "Maharashtra", type: "Rock-cut Cave Complex",
    cultural_importance: "Contains the world's greatest surviving ancient paintings. A masterclass in Buddhist art spanning 800 years.",
    architecture: "Rock-cut Buddhist caves including chaitya halls and viharas. Paintings use tempera technique on volcanic rock.",
    key_facts: ["30 caves carved over 800 years in two phases", "Paintings survived because the caves were sealed by vegetation", "Rediscovered in 1819 by a British tiger-hunting party", "Cave 1 contains the famous Padmapani and Vajrapani paintings"],
    fun_fact: "A British officer named John Smith literally stumbled upon the caves while chasing a tiger in 1819 — you can still see his graffiti scratched on Cave 10.",
    best_time_to_visit: "October to March", entry_fee: "₹40 Indians, ₹600 foreigners", unesco: true
  },
  "Konark Sun Temple": {
    built_by: "King Narasimhadeva I of Eastern Ganga dynasty", year_built: "1250 CE", location: "Konark", state: "Odisha", type: "Temple",
    cultural_importance: "Designed as a colossal chariot of the Sun God with 24 stone wheels and 7 horses. A masterpiece of Kalinga architecture.",
    architecture: "Kalinga architecture in khondalite stone. 24 intricately carved wheels that function as sundials.",
    key_facts: ["24 stone wheels function as actual sundials accurate to the minute", "7 horses pull the chariot — representing 7 days of the week", "The main tower (now collapsed) was estimated at 70m tall", "Iron beams weighing several tonnes were used in construction"],
    fun_fact: "The wheels are so precisely carved that you can tell the exact time of day from the shadow cast by the wheel's spokes — they're functioning sundials!",
    best_time_to_visit: "October to March", entry_fee: "₹40 Indians, ₹600 foreigners", unesco: true
  },
  "India Gate Delhi": {
    built_by: "Sir Edwin Lutyens", year_built: "1931", location: "New Delhi", state: "Delhi", type: "War Memorial",
    cultural_importance: "All India War Memorial dedicated to 82,000 Indian soldiers who died in World War I and the Third Anglo-Afghan War.",
    architecture: "Triumphal arch modelled on the Arc de Triomphe. Built in red sandstone and granite. 42m tall.",
    key_facts: ["42 metres tall", "Names of 13,300 servicemen inscribed on the arch", "The Amar Jawan Jyoti eternal flame burned here from 1972 to 2022", "Part of Lutyens' Delhi, the planned capital"],
    fun_fact: "India Gate was originally called the 'All India War Memorial' and the flame was only added in 1972 after the Bangladesh Liberation War.",
    best_time_to_visit: "October to March", entry_fee: "Free"
  },
}

// Time Travel periods from SANSKRITI-AI-main/app.py
const TIME_PERIODS = [
  {
    key: "construction",
    label: "🏗️ Construction",
    period: "~1630s–1650s",
    description: "The monument is being built. Thousands of artisans at work, scaffolding everywhere, raw stone being carved into history.",
    icon: "⚒️",
    accent: "#C8A06E"
  },
  {
    key: "peak_glory",
    label: "✨ Peak Glory",
    period: "~1700s",
    description: "At the height of power. The monument gleams in its full original glory — vibrant colours, royal ceremonies, bustling courts.",
    icon: "👑",
    accent: "#E8C97A"
  },
  {
    key: "colonial",
    label: "🇬🇧 Colonial Era",
    period: "~1800s",
    description: "Under British rule. The monument has aged, early photography era, colonial visitors exploring ancient ruins.",
    icon: "🎩",
    accent: "#A0A0A0"
  },
  {
    key: "modern",
    label: "📸 Modern Day",
    period: "Present",
    description: "Today — fully restored, UNESCO protected, millions of visitors from around the world experiencing living history.",
    icon: "📸",
    accent: "#7ECDC0"
  },
]

// Slug mapping for time_travel image folders (matches actual folder names in public/time_travel/)
const TIME_TRAVEL_SLUG_MAP: Record<string, string> = {
  'Taj Mahal': 'taj_mahal',
  'Red Fort': 'red_fort',
  'Qutub Minar': 'qutub_minar',
  'Hampi': 'hampi',
  'Konark Sun Temple': 'konark_sun_temple',
  'Ajanta Caves': 'ajanta_caves',
  'Hawa Mahal Jaipur': 'hawa_mahal_jaipur',
  'India Gate Delhi': 'india_gate_delhi',
}

const SUSTAINABILITY_TIPS = [
  "🚯 Carry a reusable water bottle — avoid single-use plastic at heritage sites",
  "📵 Follow posted photography rules — flash damages ancient pigments",
  "👣 Stay on marked pathways to prevent erosion of centuries-old surfaces",
  "♻️ Use eco-friendly sunscreen to protect stone surfaces from chemical damage",
  "🌿 Support local artisans by buying authentic crafts, not mass-produced souvenirs",
]

const TAB_ITEMS = [
  { id: 'history', label: '📖 History' },
  { id: 'architecture', label: '🏛️ Architecture' },
  { id: 'facts', label: '📊 Key Facts' },
  { id: 'fun', label: '💡 Fun Facts' },
  { id: 'visitor', label: '🎯 Visitor Info' },
  { id: 'timetravel', label: '⏳ Time Travel' },
]

function findMonumentData(name: string) {
  // Exact match
  if (MONUMENT_DATA[name]) return MONUMENT_DATA[name]
  // Fuzzy match
  const lower = name.toLowerCase()
  for (const [key, val] of Object.entries(MONUMENT_DATA)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) return val
  }
  return null
}

function getTimeTravelSlug(name: string): string | null {
  if (TIME_TRAVEL_SLUG_MAP[name]) return TIME_TRAVEL_SLUG_MAP[name]
  const lower = name.toLowerCase()
  for (const [key, slug] of Object.entries(TIME_TRAVEL_SLUG_MAP)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) return slug
  }
  return null
}

export function MonumentDetailTabs({ monumentName }: { monumentName: string }) {
  const [activeTab, setActiveTab] = useState('history')
  const [selectedEra, setSelectedEra] = useState('modern')
  const [imgError, setImgError] = useState(false)
  const data = findMonumentData(monumentName)

  if (!data) return null

  const currentPeriod = TIME_PERIODS.find(p => p.key === selectedEra) || TIME_PERIODS[3]
  const ttSlug = getTimeTravelSlug(monumentName)
  const imgSrc = ttSlug ? `/time_travel/${ttSlug}/${selectedEra}.jpg` : null

  return (
    <div style={{ marginTop: 32 }}>
      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: 0, overflowX: 'auto', borderBottom: '1px solid rgba(201,168,76,0.2)',
        marginBottom: 0, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none'
      }}>
        {TAB_ITEMS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              background: 'transparent', border: 'none', whiteSpace: 'nowrap',
              color: activeTab === tab.id ? '#C9A84C' : '#8A7560',
              borderBottom: activeTab === tab.id ? '2px solid #C9A84C' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        background: 'rgba(28,22,56,0.9)', border: '1px solid rgba(201,168,76,0.2)',
        borderTop: 'none', borderRadius: '0 0 16px 16px', padding: 24, minHeight: 200
      }}>
        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {[
                { label: '🧱 Built By', value: data.built_by },
                { label: '📅 Year Built', value: data.year_built },
                { label: '📍 Location', value: `${data.location}, ${data.state}` },
                { label: '🏗️ Type', value: data.type },
              ].map(item => (
                <div key={item.label} style={{ background: 'rgba(15,11,30,0.6)', borderRadius: 10, padding: 14 }}>
                  <div style={{ color: '#8A7560', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ color: '#E8C97A', fontSize: 14, fontWeight: 600 }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{
              background: 'rgba(75,155,142,0.08)', border: '1px solid rgba(75,155,142,0.3)',
              borderRadius: 12, padding: 16, marginBottom: 16
            }}>
              <div style={{ color: '#7ECDC0', fontWeight: 700, marginBottom: 6, fontSize: 13 }}>🌏 Cultural Importance</div>
              <div style={{ color: '#C4A882', fontSize: 14, lineHeight: 1.7 }}>{data.cultural_importance}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {data.unesco && (
                <span style={{
                  background: 'rgba(75,155,142,0.15)', border: '1px solid rgba(75,155,142,0.5)',
                  borderRadius: 999, padding: '4px 12px', fontSize: 12, color: '#7ECDC0', fontWeight: 700
                }}>🏆 UNESCO World Heritage</span>
              )}
              {data.seven_wonders && (
                <span style={{
                  background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)',
                  borderRadius: 999, padding: '4px 12px', fontSize: 12, color: '#E8C97A', fontWeight: 700
                }}>✨ Seven Wonders of the World</span>
              )}
            </div>
          </div>
        )}

        {/* Architecture Tab */}
        {activeTab === 'architecture' && (
          <div>
            <div style={{ color: '#C9A84C', fontWeight: 700, fontSize: 16, marginBottom: 12, fontFamily: 'Georgia, serif' }}>
              🏛️ Architecture & Construction
            </div>
            <div style={{
              background: 'rgba(75,155,142,0.08)', border: '1px solid rgba(75,155,142,0.3)',
              borderRadius: 12, padding: 16, color: '#C4A882', fontSize: 14, lineHeight: 1.8
            }}>
              {data.architecture}
            </div>
          </div>
        )}

        {/* Key Facts Tab */}
        {activeTab === 'facts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.key_facts.map((fact, i) => (
              <div key={i} style={{
                background: 'rgba(15,11,30,0.6)', border: '1px solid rgba(201,168,76,0.15)',
                borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12
              }}>
                <span style={{
                  color: '#C9A84C', fontWeight: 700, fontSize: 18, minWidth: 28, fontFamily: 'Georgia, serif'
                }}>#{i + 1}</span>
                <span style={{ color: '#C4A882', fontSize: 14, lineHeight: 1.6 }}>{fact}</span>
              </div>
            ))}
          </div>
        )}

        {/* Fun Facts Tab */}
        {activeTab === 'fun' && (
          <div>
            <div style={{
              background: 'rgba(201,168,76,0.08)', border: '2px solid rgba(201,168,76,0.4)',
              borderRadius: 16, padding: 24, fontSize: 16, lineHeight: 1.8, color: '#E8C97A',
              textAlign: 'center'
            }}>
              💡 {data.fun_fact}
            </div>
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <a href="/quiz" style={{
                display: 'inline-block', padding: '12px 28px', borderRadius: 10,
                background: 'linear-gradient(135deg, #D4893F, #C9A84C)',
                color: '#0F0B1E', fontWeight: 700, textDecoration: 'none', fontSize: 14
              }}>
                🧠 Go to Quiz →
              </a>
            </div>
          </div>
        )}

        {/* Visitor Info Tab */}
        {activeTab === 'visitor' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div style={{ background: 'rgba(15,11,30,0.6)', borderRadius: 10, padding: 14 }}>
                <div style={{ color: '#8A7560', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>🗓️ Best Time to Visit</div>
                <div style={{ color: '#E8C97A', fontSize: 14, fontWeight: 600 }}>{data.best_time_to_visit}</div>
              </div>
              <div style={{ background: 'rgba(15,11,30,0.6)', borderRadius: 10, padding: 14 }}>
                <div style={{ color: '#8A7560', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>🎟️ Entry Fee</div>
                <div style={{ color: '#E8C97A', fontSize: 14, fontWeight: 600 }}>{data.entry_fee}</div>
              </div>
            </div>
            {/* Sustainability tip */}
            <div style={{
              background: 'rgba(75,142,110,0.1)', border: '1px solid rgba(75,142,110,0.4)',
              borderRadius: 12, padding: 16
            }}>
              <div style={{ color: '#7ECDA0', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🌿 Sustainability Tip</div>
              <div style={{ color: '#C4A882', fontSize: 13, lineHeight: 1.6 }}>
                {SUSTAINABILITY_TIPS[Math.floor(Math.random() * SUSTAINABILITY_TIPS.length)]}
              </div>
            </div>
          </div>
        )}

        {/* Time Travel Tab — with real images */}
        {activeTab === 'timetravel' && (
          <div>
            <div style={{
              background: 'linear-gradient(135deg, rgba(27,16,64,0.8), rgba(122,46,59,0.06))',
              border: '1px solid rgba(201,168,76,0.25)', borderRadius: 14, padding: '1rem 1.5rem', marginBottom: '1rem'
            }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.05rem', color: '#E8C97A', fontWeight: 600 }}>
                ⏳ 360° Time Travel Mode
              </div>
              <div style={{ color: '#C4A882', fontSize: '0.82rem', marginTop: 4 }}>
                🖱️ Click and drag inside the viewer to look around in 360° — select an era below to travel through history
              </div>
            </div>
            {/* Era buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {TIME_PERIODS.map(period => (
                <button key={period.key}
                  onClick={() => { setSelectedEra(period.key); setImgError(false) }}
                  style={{
                    padding: '8px 14px', borderRadius: 999,
                    border: selectedEra === period.key
                      ? `2px solid ${period.accent}`
                      : '1px solid rgba(201,168,76,0.25)',
                    background: selectedEra === period.key
                      ? `${period.accent}22`
                      : 'transparent',
                    color: selectedEra === period.key ? period.accent : '#C4A882',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {/* 360° Panorama or placeholder */}
            {imgSrc && !imgError ? (
              <PanoramaViewer
                imageSrc={imgSrc}
                accentColor={currentPeriod.accent}
                eraLabel={currentPeriod.label}
                eraPeriod={currentPeriod.period}
                monumentName={monumentName}
              />
            ) : (
              <div style={{
                background: 'rgba(28,22,56,0.9)',
                border: `2px dashed ${currentPeriod.accent}66`,
                borderRadius: 14, padding: '4rem 2rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                  {currentPeriod.icon}
                </div>
                <div style={{ color: currentPeriod.accent, fontFamily: 'Georgia, serif', fontSize: '1.2rem' }}>
                  {monumentName}
                </div>
                <div style={{ color: currentPeriod.accent, fontSize: '0.9rem', opacity: 0.8, margin: '0.5rem 0' }}>
                  {currentPeriod.label} · {currentPeriod.period}
                </div>
                <div style={{ color: '#7A6E5C', fontSize: '0.75rem', marginTop: '1.5rem',
                  background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '0.8rem 1.2rem', display: 'inline-block' }}>
                  📁 Add panorama image to: public/time_travel/{'{slug}'}/{'{era}'}.jpg
                </div>
              </div>
            )}

            {/* Era description */}
            <div style={{
              background: 'rgba(28,22,56,0.9)',
              border: `1px solid ${currentPeriod.accent}33`,
              borderRadius: 12, padding: '1.2rem 1.5rem', marginTop: '1rem'
            }}>
              <div style={{ color: currentPeriod.accent, fontFamily: 'Georgia, serif', fontWeight: 600, marginBottom: '0.5rem' }}>
                {currentPeriod.label} · {currentPeriod.period}
              </div>
              <div style={{ color: '#C4A882', fontSize: '0.88rem', lineHeight: 1.7 }}>
                {currentPeriod.description}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
