"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { useAuth } from "@/lib/authContext"
import { addXP, computeAndSaveBadges } from "@/lib/authClient"
import { useLang } from "@/lib/languageContext"
import { SupportedLanguage, getLanguageConfig } from "@/lib/languages"
import { hasNativeNvidia, synthesizeNarrationNative, translateExploreGuideNative } from "@/lib/nativeNvidia"
import { getNvidiaNarrationVoice } from "@/lib/narrationProfiles"
import { isBundledAndroidApp } from "@/lib/supabase/client"
import { emitYatrikEvent } from "@/lib/yatrik/events"
import {
  ExploreARHud,
  type ExploreFallbackStatus,
  type ExploreMode,
  type ExploreNarrationStatus,
  type ExploreViewMode,
} from "@/components/explore/explore-ar-hud"
import { useYatrikControls } from "@/components/yatrik/yatrik-provider"

import { saveMonument } from "@/lib/monumentStore"
import { useARNavigation } from "@/hooks/useARNavigation"
import { getCustomMonument, type CustomZone } from "@/lib/customMonuments"
import { angleDiffDegrees, distanceMeters as calculateDistanceMeters } from "@/lib/arNavigation"

const DEMO_MONUMENT_ID = "college"
const DEMO_ANCHOR = { lat: 30.770888, lng: 76.569856 }
const FIXED_DEMO_START = { lat: 30.7703, lng: 76.5693 }

/* eslint-disable @typescript-eslint/no-explicit-any */

const MONUMENT_NAMES: Record<string, string> = {
  'taj-mahal': 'Taj Mahal', 'red-fort': 'Red Fort', 'qutub-minar': 'Qutub Minar',
  'gateway-india': 'Gateway of India', 'hampi': 'Hampi', 'golden-temple': 'Golden Temple Amritsar',
  'kedarnath': 'Kedarnath Temple', 'meenakshi': 'Meenakshi Amman Temple', 'mysore-palace': 'Mysore Palace',
  'hawa-mahal': 'Hawa Mahal Jaipur', 'charminar': 'Charminar Hyderabad', 'victoria-memorial': 'Victoria Memorial Kolkata',
  'ajanta': 'Ajanta Caves', 'konark': 'Konark Sun Temple', 'india-gate': 'India Gate Delhi',
}

interface GuideTranslation {
  directionHint: string
  arrivalFact: string
  miniFact: string
}

const GUIDE_TRANSLATION_STORAGE_KEY = 'sanskriti-explore-translations-v5'

// ── TAJ MAHAL ZONES ──────────────────────────────────────
const TAJ_ZONES = [
  {
    id: 1, name: "Main Gate (Darwaza-i-Rauza)", emoji: "🚪",
    lat: 27.17390, lng: 78.04215, radius: 50, xp: 50,
    arrival_fact: "You are standing at the Great Gate of the Taj Mahal, built entirely from red sandstone. This magnificent gateway stands 30 metres tall and is inscribed with verses from the Quran in black marble. As you pass through this gate, the Taj Mahal is revealed in perfect symmetry — exactly as Shah Jahan intended. The gate was designed to frame the entire mausoleum in a single breathtaking view.",
    direction_hint: "You are near the entrance of Taj Mahal complex. Walk straight ahead toward the large red sandstone archway.",
    mini_fact: "The gate has 11 small domed kiosks on top called chhatris.",
    local_belief: "It is said Shah Jahan designed the gateway so that the Taj Mahal is completely hidden until you take the very last step through the arch - the sudden reveal was intentional, meant to feel like the doors of paradise opening. Workers who built the gate reportedly wept when they first saw what they had been building toward."
  },
  {
    id: 2, name: "Reflecting Pool Center", emoji: "🌊",
    lat: 27.17420, lng: 78.04215, radius: 45, xp: 75,
    arrival_fact: "You are standing at the Hauz-i-Kausar — the Pool of Abundance. This rectangular reflecting pool stretches 162 metres long and perfectly mirrors the Taj Mahal in its waters. Shah Jahan believed water symbolized paradise in Islamic tradition. On a clear morning, you can see two Taj Mahals — one in the sky and one in the water below. Every photograph you have ever seen of the Taj Mahal was likely taken from exactly where you are standing.",
    direction_hint: "From the Main Gate, walk straight ahead about 100 metres. You will see a long rectangular pool stretching toward the Taj Mahal.",
    mini_fact: "The pool was designed so the Taj Mahal appears at its center when viewed from this exact spot.",
    local_belief: "Guides at the Taj have repeated for generations that the pool was built not for beauty but for protection - if you look directly at the marble under the midday sun, the reflected light can temporarily blind you. The pool gives visitors a way to see the Taj without ever having to look at it directly. Whether true or not, the architects of the Mughal empire were known to design consequences into beauty."
  },
  {
    id: 3, name: "Whispering Gallery", emoji: "🔊",
    lat: 27.17510, lng: 78.04215, radius: 40, xp: 100,
    arrival_fact: "You have entered the main mausoleum chamber — the Whispering Gallery of the Taj Mahal. The inner dome rises 24 metres above you. Due to the perfect acoustic design, even the softest whisper travels along the curved walls and can be heard clearly on the opposite side. Shah Jahan's architects designed this intentionally — so that prayers for Mumtaz Mahal would echo eternally within these walls. At the center lie the cenotaphs of Mumtaz Mahal and Shah Jahan, surrounded by a screen of carved marble so fine it looks like lace.",
    direction_hint: "Walk past the reflecting pool and climb the marble plinth steps. Enter the main white marble mausoleum through the central arch.",
    mini_fact: "The actual tombs of Shah Jahan and Mumtaz are in a crypt directly below the cenotaphs."
  },
  {
    id: 4, name: "River Terrace (Yamuna View)", emoji: "🌅",
    lat: 27.17545, lng: 78.04215, radius: 45, xp: 125,
    arrival_fact: "You are standing on the River Terrace at the back of the Taj Mahal, overlooking the sacred Yamuna river. This is the most peaceful and least visited spot in the entire complex. Shah Jahan spent his final years imprisoned in Agra Fort across this very river, gazing at the Taj Mahal from a distance — never allowed to visit the tomb he built for his beloved wife. On full moon nights, the Taj Mahal glows silver from this terrace. You are standing where emperors once stood to grieve.",
    direction_hint: "Walk around to the back of the main mausoleum. Follow the marble pathway to the northern terrace overlooking the Yamuna river.",
    mini_fact: "Shah Jahan originally planned a black marble Taj Mahal for himself across the river, connected by a silver bridge."
  },
  {
    id: 5, name: "Great Gate (Darwaza-i-Rauza)", emoji: "🕌",
    lat: 27.17492, lng: 78.04212, radius: 42, xp: 150,
    arrival_fact: "You are at the Great Gate, the 30-metre red sandstone portal that frames the sacred axis of the Taj complex. Its Quranic inscriptions were scaled with visual precision so they read clearly from below. The gateway hides the mausoleum until the final step through the arch, turning arrival into a theatrical reveal.",
    direction_hint: "Stand along the southern edge and face the central archway. Walk forward until the mausoleum appears fully framed.",
    mini_fact: "Calligraphy near the top is physically larger, so it appears uniform from ground level."
  },
  {
    id: 6, name: "Outer Courtyard (Jilaukhana)", emoji: "🏛️",
    lat: 27.17496, lng: 78.04196, radius: 42, xp: 175,
    arrival_fact: "You are in the Jilaukhana, the forecourt where caravans, officials, and mourners gathered before entering the main garden. This transitional precinct organized movement, ceremony, and security at imperial scale. Tombs associated with Mumtaz's attendants stand nearby, embedding memory into the entry sequence.",
    direction_hint: "Move through the southern forecourt lanes before approaching the monumental gate.",
    mini_fact: "The forecourt acted as a social and ceremonial buffer before the sacred core."
  },
  {
    id: 7, name: "Hauz-i-Kausar (Central Tank)", emoji: "💧",
    lat: 27.17502, lng: 78.04218, radius: 42, xp: 200,
    arrival_fact: "You are by the raised Hauz-i-Kausar tank, fed by a channel symbolically called the River of Paradise. Its reflective surface was designed to hold a complete mirrored image of the Taj. Water, geometry, and sky are combined here as one architectural instrument.",
    direction_hint: "Walk along the central axis and stop where the marble tank aligns with the mausoleum.",
    mini_fact: "The tank's positioning was optimized for full frontal reflection."
  },
  {
    id: 8, name: "West Mosque", emoji: "🕋",
    lat: 27.17518, lng: 78.04186, radius: 40, xp: 225,
    arrival_fact: "You are at the western mosque, built in red sandstone and used for Friday prayers. Its position on the west aligns with ritual orientation. The matching eastern structure exists as a jawab, created to preserve absolute visual symmetry.",
    direction_hint: "Head toward the western side of the plinth to the active prayer structure.",
    mini_fact: "Only the west building functions as a mosque; the east counterpart is architectural balance."
  },
  {
    id: 9, name: "Jawab (Echo Building)", emoji: "🪞",
    lat: 27.17518, lng: 78.04236, radius: 40, xp: 250,
    arrival_fact: "You are at the jawab, the mirror building opposite the mosque. It was built to complete the composition, not for congregational worship. Its orientation intentionally does not face Mecca, confirming its role as a symmetrical counterpart.",
    direction_hint: "Cross to the eastern side opposite the mosque and compare both facades.",
    mini_fact: "The jawab is one of the clearest examples of symmetry prioritized over function."
  },
  {
    id: 10, name: "Main Plinth (Chowk-i-Jilo Khana)", emoji: "⬜",
    lat: 27.17522, lng: 78.04210, radius: 40, xp: 275,
    arrival_fact: "You are on the elevated marble plinth that carries the mausoleum and its four minarets. Below this platform are hollow chambers historically linked to storage and service circulation. The plinth separates sacred architecture from the garden plane with deliberate monumental height.",
    direction_hint: "Climb the marble steps and stand on the raised platform beneath the main structure.",
    mini_fact: "The platform amplifies both flood protection and visual dominance."
  },
  {
    id: 11, name: "Minarets Base", emoji: "🗼",
    lat: 27.17528, lng: 78.04226, radius: 38, xp: 300,
    arrival_fact: "You are at the base of one of the four minarets that frame the Taj. Each tower was engineered with a subtle outward tilt. This precaution meant a collapse would fall away from the mausoleum instead of onto it.",
    direction_hint: "Move to a corner of the main marble plinth and look up along the minaret shaft.",
    mini_fact: "The minarets are both ceremonial markers and structural risk-management by design.",
    local_belief: "The four minarets lean slightly outward - not from age or settling, but by design. Builders and guides still repeat the story: if any minaret ever fell, it would fall away from the tomb, never onto it. Whether Shah Jahan commanded this or the architects decided alone, no one knows."
  },
  {
    id: 12, name: "Inner Dome Chamber", emoji: "🕯️",
    lat: 27.17524, lng: 78.04214, radius: 38, xp: 325,
    arrival_fact: "You are inside the chamber beneath the iconic double dome system. The outer dome seen from outside is a shell above, while the inner dome sits significantly lower, creating dramatic height and controlled acoustics. This layered geometry shapes the whispering resonance visitors still hear.",
    direction_hint: "Enter the main chamber and look upward from beneath the central vault.",
    mini_fact: "The inner and outer domes are separated to control scale, temperature, and sound."
  },
  {
    id: 13, name: "Mumtaz Mahal's Cenotaph", emoji: "🌸",
    lat: 27.17526, lng: 78.04212, radius: 36, xp: 350,
    arrival_fact: "You are at Mumtaz Mahal's cenotaph, the ornamental tomb at the symbolic heart of the chamber. The actual sarcophagus lies in the lower crypt below. The cenotaph here is ceremonial, crafted for memory, devotion, and imperial artistry.",
    direction_hint: "Approach the center of the chamber near the marble screen enclosure.",
    mini_fact: "The visible cenotaph is not the burial chamber; the real interment is beneath it.",
    local_belief: "Local legend holds that Shah Jahan wept so much after Mumtaz died that his hair turned white in a single year. He is said to have visited her cenotaph every Friday without exception for the 22 years it took to build the Taj - starting from the day the foundation was laid, before there was anything to see."
  },
  {
    id: 14, name: "Shah Jahan's Cenotaph", emoji: "👑",
    lat: 27.17527, lng: 78.04216, radius: 36, xp: 375,
    arrival_fact: "You are at Shah Jahan's cenotaph, placed beside Mumtaz after his death. Its offset position introduces the only major asymmetry inside the mausoleum. What began as a perfectly centered single memorial became a dual resting composition.",
    direction_hint: "Stand beside the paired cenotaph arrangement and note the slight displacement from center.",
    mini_fact: "Shah Jahan's addition is the principal asymmetrical element in the complex.",
    local_belief: "Locals believe the asymmetry of Shah Jahan's tomb - the only imperfect element in the entire complex - was deliberate. He had always planned to build a twin Taj in black marble across the Yamuna for himself. When his son Aurangzeb imprisoned him, that dream died, and his tomb was placed beside Mumtaz's as an afterthought, forever breaking the symmetry he had spent a lifetime perfecting."
  },
  {
    id: 15, name: "Pietra Dura Inlay Panels", emoji: "💎",
    lat: 27.17514, lng: 78.04224, radius: 38, xp: 400,
    arrival_fact: "You are viewing the pietra dura floral inlay panels carved into white marble. Artisans assembled these motifs from precious and semi-precious stones sourced across Asia. Many individual flowers are mosaics of dozens of carefully cut pieces.",
    direction_hint: "Trace the lower wall panels and look closely at the floral stonework.",
    mini_fact: "Some motifs combine 50 to 60 stone fragments in a single flower composition."
  },
  {
    id: 16, name: "Calligraphy Bands", emoji: "✒️",
    lat: 27.17512, lng: 78.04204, radius: 38, xp: 425,
    arrival_fact: "You are beneath the grand iwan where Quranic calligraphy bands frame the arches. The script was intentionally scaled larger at higher levels to appear equal in size from the ground. This is an early and brilliant use of optical correction in architecture.",
    direction_hint: "Step back from the facade and follow the black marble inscriptions around the arch.",
    mini_fact: "The lettering grows with height so the human eye reads it as uniform."
  },
  {
    id: 17, name: "Moonlight Garden (Mahtab Bagh)", emoji: "🌙",
    lat: 27.17556, lng: 78.04220, radius: 44, xp: 450,
    arrival_fact: "You are aligned with Mahtab Bagh, the moonlight garden across the Yamuna to the north. It served as a designed viewing platform where the Taj could be seen with water reflections under full moon light. This northern vantage extended the monument's visual theater beyond its walls.",
    direction_hint: "Move to the northern edge and face across the river toward the aligned garden axis.",
    mini_fact: "Mahtab Bagh completes the Taj's larger riverfront planning geometry.",
    local_belief: "This garden across the river was where Shah Jahan sat during the last years of his imprisonment, staring at the Taj Mahal from a distance - close enough to see it, forbidden to cross. His daughter Jahanara sat beside him. When he died, Aurangzeb moved his body to the Taj at night. Some say his final request was simply to be buried next to her."
  },
  {
    id: 18, name: "River Yamuna Embankment", emoji: "🌊",
    lat: 27.17558, lng: 78.04200, radius: 44, xp: 475,
    arrival_fact: "You are at the rear riverfront embankment where the Yamuna runs behind the mausoleum terrace. The river edge was integrated into the site strategy, helping define defense and approach conditions from the north. This boundary also gave the Taj its famous mirrored relationship with water and sky.",
    direction_hint: "Walk to the northern terrace edge and look directly down toward the riverfront line.",
    mini_fact: "The north edge was planned so hostile approach from the river side remained difficult."
  },
  {
    id: 19, name: "Artisan's Quarter Ruins", emoji: "🧱",
    lat: 27.17552, lng: 78.04258, radius: 44, xp: 500,
    arrival_fact: "You are at the remains linked to the artisan service quarter east of the main complex. During construction, thousands of craftsmen and laborers were housed in support zones around the project. Much of this built infrastructure was later dismantled after completion.",
    direction_hint: "Head toward the eastern side beyond the core garden axis to the peripheral ruins zone.",
    mini_fact: "Historical accounts associate this area with the workforce settlement that supported construction."
  }
]

// ── RED FORT ZONES ──────────────────────────────────────
const RED_FORT_ZONES = [
  {
    id: 11, name: "Lahori Gate", emoji: "🚪",
    lat: 28.6558, lng: 77.2386, radius: 50, xp: 50,
    arrival_fact: "You are standing at the Lahori Gate, the main entrance to the Red Fort. Its name comes from its orientation towards the city of Lahore. Every Independence Day, the Prime Minister hoists the national flag from here.",
    direction_hint: "Walk straight towards the massive red sandstone gate.",
    mini_fact: "Aurangzeb added the barbican (outer wall) to make it more secure."
  },
  {
    id: 12, name: "Chatta Chowk", emoji: "🛍️",
    lat: 28.6559, lng: 77.2393, radius: 45, xp: 75,
    arrival_fact: "You have arrived at Chatta Chowk, the covered bazaar. Inspired by markets in Peshawar, Shah Jahan built this so the royal household could shop for silk, jewelry, and other exotic items without leaving the fort.",
    direction_hint: "Pass through Lahori gate into the arched corridor lined with shops.",
    mini_fact: "This is one of the very few covered markets from Mughal India."
  },
  {
    id: 13, name: "Diwan-i-Am", emoji: "👑",
    lat: 28.6561, lng: 77.2415, radius: 45, xp: 100,
    arrival_fact: "This is the Diwan-i-Am, the Hall of Public Audience. Emperor Shah Jahan sat on the ornate marble canopy (jharokha) to hear the grievances of commoners, separated by silver railings.",
    direction_hint: "Walk past the Naubat Khana to the large pillared red sandstone hall.",
    mini_fact: "The hall originally had ivory-colored polish that looked like white marble."
  },
  {
    id: 14, name: "Diwan-i-Khas", emoji: "💎",
    lat: 28.6565, lng: 77.2428, radius: 50, xp: 125,
    arrival_fact: "Welcome to the Diwan-i-Khas, the Hall of Private Audience. Here the Emperor met with VIPs. It once housed the legendary solid gold Peacock Throne, studded with precious gems including the Koh-i-Noor diamond.",
    direction_hint: "Head further east towards the intricately carved white marble pavilion.",
    mini_fact: "The Persian inscription here reads: 'If there is a paradise on earth, it is this'."
  },
  {
    id: 15, name: "Naubat Khana", emoji: "🥁",
    lat: 28.6561, lng: 77.2407, radius: 42, xp: 150,
    arrival_fact: "You are at the Naubat Khana, or Drum House, where imperial musicians announced the emperor's arrival and marked the hours of the day. Visitors of rank dismounted here before approaching the public audience court.",
    direction_hint: "Continue east from Chatta Chowk toward the tall red gateway before the Diwan-i-Am.",
    mini_fact: "The building turned music into ceremony, separating the public market from the imperial court."
  },
  {
    id: 16, name: "Mumtaz Mahal", emoji: "🏺",
    lat: 28.6555, lng: 77.2425, radius: 40, xp: 175,
    arrival_fact: "This southernmost palace pavilion is the Mumtaz Mahal. Once part of the imperial women's apartments, its rooms now help preserve and display objects that reveal courtly life inside Shah Jahan's palace-fort.",
    direction_hint: "From the Diwan-i-Am, follow the path southeast toward the first surviving palace pavilion.",
    mini_fact: "Mumtaz Mahal formed part of the private zenana, away from the fort's public audience halls."
  },
  {
    id: 17, name: "Rang Mahal", emoji: "🎨",
    lat: 28.6559, lng: 77.2428, radius: 40, xp: 200,
    arrival_fact: "You have reached the Rang Mahal, the Palace of Colours. Painted interiors, mirrored decoration, water channels, and a central marble basin once made this one of the most luxurious apartments in the imperial residence.",
    direction_hint: "Walk north from Mumtaz Mahal to the next long pavilion facing the former riverfront.",
    mini_fact: "Water from the Nahr-i-Bihisht cooled the central marble basin beneath the pavilion."
  },
  {
    id: 18, name: "Khas Mahal", emoji: "🛏️",
    lat: 28.6563, lng: 77.2430, radius: 40, xp: 225,
    arrival_fact: "This is the Khas Mahal, Shah Jahan's private palace. It combined sleeping chambers, prayer spaces, and a projecting tower where the emperor could appear before subjects gathered below.",
    direction_hint: "Continue north along the river-facing line of marble pavilions.",
    mini_fact: "Its rooms joined private life, royal ritual, and public visibility in one compact palace."
  },
  {
    id: 19, name: "Nahr-i-Bihisht", emoji: "💧",
    lat: 28.6564, lng: 77.2431, radius: 38, xp: 250,
    arrival_fact: "You are following the Nahr-i-Bihisht, the Stream of Paradise. This continuous water channel linked the private pavilions, bringing movement, reflection, and cooling air into the heart of the palace.",
    direction_hint: "Look along the marble floor channels connecting the riverfront pavilions.",
    mini_fact: "UNESCO identifies the linked pavilions and their water channel as a defining feature of the Red Fort's plan."
  },
  {
    id: 20, name: "Hammam", emoji: "♨️",
    lat: 28.6568, lng: 77.2429, radius: 40, xp: 275,
    arrival_fact: "These are the imperial Hammam baths, a sequence of marble chambers once supplied with hot and cold water. Inlaid floral patterns and filtered light transformed bathing into an elaborate royal ritual.",
    direction_hint: "Move north of the Diwan-i-Khas toward the enclosed marble bath chambers.",
    mini_fact: "Different rooms supported hot, warm, and cool bathing within the palace."
  },
  {
    id: 21, name: "Moti Masjid", emoji: "🤍",
    lat: 28.6570, lng: 77.2426, radius: 42, xp: 300,
    arrival_fact: "You are at the Moti Masjid, or Pearl Mosque, built by Aurangzeb as a private place of worship. Its compact white-marble prayer hall contrasts sharply with the massive red sandstone walls around it.",
    direction_hint: "Continue north from the Hammam and look for the small white-marble mosque behind a high enclosure.",
    mini_fact: "The mosque's name comes from the pearl-like glow of its polished marble."
  },
  {
    id: 22, name: "Hayat Bakhsh Bagh", emoji: "🌿",
    lat: 28.6575, lng: 77.2425, radius: 46, xp: 325,
    arrival_fact: "You have entered Hayat Bakhsh Bagh, the Life-Bestowing Garden. Water channels, walkways, pavilions, and planted squares created a formal garden landscape based on Mughal visions of paradise.",
    direction_hint: "Walk north into the large garden court beyond the private palace zone.",
    mini_fact: "Its name means 'life-bestowing garden', reflecting the Mughal union of water, shade, and ordered nature."
  },
  {
    id: 23, name: "Zafar Mahal", emoji: "⛲",
    lat: 28.6576, lng: 77.2429, radius: 40, xp: 350,
    arrival_fact: "This red sandstone pavilion is Zafar Mahal, added by Bahadur Shah Zafar in the central water tank of Hayat Bakhsh Bagh. It is a late Mughal layer inserted into Shah Jahan's earlier garden plan.",
    direction_hint: "Follow the garden channels toward the pavilion standing in the central tank.",
    mini_fact: "Zafar Mahal shows that the Red Fort continued to evolve long after Shah Jahan."
  },
  {
    id: 24, name: "Sawan Pavilion", emoji: "🌧️",
    lat: 28.6577, lng: 77.2424, radius: 38, xp: 375,
    arrival_fact: "You are at the Sawan Pavilion, one of two monsoon pavilions facing the garden's water channels. Cascading water once created the sound and cool atmosphere of seasonal rain.",
    direction_hint: "Move to the western end of the garden's north-south water channel.",
    mini_fact: "Sawan is a monsoon month, and the pavilion used flowing water to evoke rainy-season relief."
  },
  {
    id: 25, name: "Bhadon Pavilion", emoji: "🌦️",
    lat: 28.6577, lng: 77.2432, radius: 38, xp: 400,
    arrival_fact: "This is the Bhadon Pavilion, paired with Sawan across the garden axis. Water once fell over niches fitted with small lamps, making the illuminated cascade shimmer after dark.",
    direction_hint: "Cross the garden channel to the matching pavilion on the eastern side.",
    mini_fact: "The twin pavilions are named after successive months of the Indian monsoon."
  },
  {
    id: 26, name: "Shah Burj", emoji: "🗼",
    lat: 28.6580, lng: 77.2434, radius: 44, xp: 425,
    arrival_fact: "You are near Shah Burj, the northeastern tower associated with the hydraulic system that fed the palace channels. From here, water entered the elevated network serving gardens and royal apartments.",
    direction_hint: "Continue northeast to the tower at the end of the river-facing palace line.",
    mini_fact: "The Red Fort's celebrated water architecture depended on lifting and distributing river water from this side."
  },
  {
    id: 27, name: "Hira Mahal", emoji: "💠",
    lat: 28.6579, lng: 77.2431, radius: 38, xp: 450,
    arrival_fact: "You have reached Hira Mahal, a small marble pavilion associated with Bahadur Shah Zafar. Its delicate scale preserves a final glimpse of Mughal courtly architecture before the upheaval of 1857.",
    direction_hint: "Look along the northern garden edge for the compact white-marble pavilion near Shah Burj.",
    mini_fact: "Its name means 'Diamond Palace', although the pavilion is built primarily of marble."
  },
  {
    id: 28, name: "Red Fort Baoli", emoji: "🪜",
    lat: 28.6573, lng: 77.2404, radius: 44, xp: 475,
    arrival_fact: "This is the Red Fort's baoli, an older stepwell absorbed into the palace-fort when Shah Jahan's complex was built around it. Descending steps once gave access to a dependable underground water source.",
    direction_hint: "Head west from Hayat Bakhsh Bagh toward the recessed stepwell enclosure.",
    mini_fact: "The stepwell predates much of Shah Jahan's palace and survived later British alterations."
  },
  {
    id: 29, name: "Delhi Gate", emoji: "🛡️",
    lat: 28.6539, lng: 77.2416, radius: 50, xp: 500,
    arrival_fact: "You are at Delhi Gate, the fort's southern entrance. Unlike the ceremonial Lahori Gate, this route primarily served soldiers and people working within the fortified complex.",
    direction_hint: "Follow the southern perimeter toward the monumental gateway flanked by red sandstone towers.",
    mini_fact: "The two principal gates reveal how ceremonial and service movement were deliberately separated."
  },
  {
    id: 30, name: "British Barracks", emoji: "🏚️",
    lat: 28.6570, lng: 77.2412, radius: 48, xp: 525,
    arrival_fact: "These barracks represent the fort's British military occupation after 1857. Large areas of the Mughal palace were cleared or repurposed, leaving a visible architectural layer of conquest, resistance, and colonial rule.",
    direction_hint: "Return toward the broad northern interior where the long colonial-era blocks stand.",
    mini_fact: "UNESCO recognizes the British military buildings as part of the Red Fort's layered history."
  }
]

// ── QUTUB MINAR ZONES ──────────────────────────────────────
const QUTUB_MINAR_ZONES = [
  {
    id: 21, name: "Qutub Minar Base", emoji: "🗼",
    lat: 28.5244, lng: 77.1855, radius: 50, xp: 50,
    arrival_fact: "You are looking up at the Qutub Minar, standing 72.5 meters tall. Built as a tower of victory by Qutb-ud-din Aibak in 1192, its five distinct stories feature intricate carvings and verses from the Quran.",
    direction_hint: "Walk straight up to the towering fluted brick minaret.",
    mini_fact: "It was struck by lightning multiple times and repaired by different rulers."
  },
  {
    id: 22, name: "Iron Pillar", emoji: "⚔️",
    lat: 28.5247, lng: 77.1849, radius: 40, xp: 75,
    arrival_fact: "You are standing before the Iron Pillar of Delhi. Dating back to the 4th century, it has amazed scientists for decades because it has barely rusted despite being exposed to the elements for over a millennium.",
    direction_hint: "Look for the metallic column standing in the center courtyard.",
    mini_fact: "It is composed of 98% wrought iron, utilizing an ancient anti-corrosion technique."
  },
  {
    id: 23, name: "Alai Darwaza", emoji: "🕌",
    lat: 28.5242, lng: 77.1852, radius: 45, xp: 100,
    arrival_fact: "You have reached the Alai Darwaza, the southern gateway of the Quwwat-ul-Islam Mosque built by Alauddin Khalji. It is considered a masterpiece of Indo-Islamic architecture, showcasing the first true dome and arches in India.",
    direction_hint: "It is the large domed gateway structure immediately south of the minaret.",
    mini_fact: "The gateway uses red sandstone alternating with white marble for a striking effect."
  },
  {
    id: 24, name: "Alai Minar", emoji: "🏗️",
    lat: 28.5256, lng: 77.1843, radius: 50, xp: 125,
    arrival_fact: "This massive pile of rubble is the Alai Minar. Alauddin Khalji intended to build a tower exactly twice the height of the Qutub Minar, but work stopped after his death when it was only 24.5 meters high.",
    direction_hint: "Walk to the northern side of the complex to find the wide, unfinished rubble base.",
    mini_fact: "The core is 24.5 meters high and was never given its outer facing of carved stone."
  },
  {
    id: 25, name: "Quwwat-ul-Islam Courtyard", emoji: "🕌",
    lat: 28.5248, lng: 77.1850, radius: 42, xp: 150,
    arrival_fact: "You are inside the courtyard of the Quwwat-ul-Islam Mosque, begun in the late 12th century and enlarged by later Delhi sultans. Its open court became the architectural heart around which the early complex grew.",
    direction_hint: "Walk west from the minar into the broad rectangular mosque courtyard.",
    mini_fact: "UNESCO describes it as the oldest mosque in northern India."
  },
  {
    id: 26, name: "Carved Pillar Cloisters", emoji: "🪷",
    lat: 28.5248, lng: 77.1847, radius: 38, xp: 175,
    arrival_fact: "These cloisters are lined with richly carved stone pillars reused from earlier temples. Floral bands, bells, chains, and figural traces reveal how local craftsmanship was adapted into a new congregational setting.",
    direction_hint: "Follow the pillared arcade along the edge of the mosque courtyard.",
    mini_fact: "The pillars preserve several distinct carving styles because they came from multiple earlier structures."
  },
  {
    id: 27, name: "Great Arched Screen", emoji: "🌙",
    lat: 28.5247, lng: 77.1846, radius: 40, xp: 200,
    arrival_fact: "You are facing the mosque's monumental western screen of pointed arches. Built as an imposing prayer façade, it combines Quranic inscriptions with geometric and vegetal carving executed by local stoneworkers.",
    direction_hint: "Cross the courtyard toward the tall carved screen on its western side.",
    mini_fact: "Five principal arches organize the historic western prayer screen."
  },
  {
    id: 28, name: "Tomb of Iltutmish", emoji: "⚰️",
    lat: 28.5250, lng: 77.1845, radius: 40, xp: 225,
    arrival_fact: "You have reached the tomb of Sultan Iltutmish, built in 1235. The square chamber is covered in dense inscriptions, geometric bands, and arabesque carving, marking an early royal tomb tradition in the Delhi Sultanate.",
    direction_hint: "Walk northwest from the mosque courtyard to the square sandstone tomb.",
    mini_fact: "The tomb stands northwest of the mosque and is among the complex's most intricately carved interiors."
  },
  {
    id: 29, name: "Iltutmish Tomb Mihrab", emoji: "✨",
    lat: 28.5250, lng: 77.1844, radius: 34, xp: 250,
    arrival_fact: "Inside the tomb, the western mihrab forms a dazzling focus of marble and sandstone calligraphy. Its layered niches demonstrate how early Sultanate builders experimented with structure and surface ornament.",
    direction_hint: "Enter the tomb chamber and face the richly carved western prayer niche.",
    mini_fact: "The chamber's decoration combines Quranic text, geometry, and scrolling plant forms."
  },
  {
    id: 30, name: "Alauddin Khalji's Madrasa", emoji: "📚",
    lat: 28.5253, lng: 77.1841, radius: 42, xp: 275,
    arrival_fact: "These ruins belonged to Alauddin Khalji's madrasa, a center for religious learning added during his ambitious expansion of the complex. Rooms once gathered students and scholars around an enclosed court.",
    direction_hint: "Continue northwest beyond Iltutmish's tomb toward the arcaded ruins.",
    mini_fact: "The madrasa and nearby tomb formed part of Alauddin's plan to reshape the entire precinct."
  },
  {
    id: 31, name: "Tomb of Alauddin Khalji", emoji: "👑",
    lat: 28.5254, lng: 77.1840, radius: 40, xp: 300,
    arrival_fact: "You are at the tomb attributed to Alauddin Khalji, set within his madrasa complex. Its ruined state contrasts with the ruler's enormous architectural ambitions, including the Alai Darwaza and unfinished Alai Minar.",
    direction_hint: "Look within the madrasa ruins for the central roofless burial chamber.",
    mini_fact: "Alauddin was among the first Delhi sultans to combine his tomb with a madrasa."
  },
  {
    id: 32, name: "Tomb of Imam Zamin", emoji: "🕊️",
    lat: 28.5241, lng: 77.1851, radius: 38, xp: 325,
    arrival_fact: "This small domed tomb belongs to Imam Zamin, a 16th-century religious figure. Its later Lodi-period design sits beside the much older Alai Darwaza, showing that the complex remained sacred across centuries.",
    direction_hint: "Return south to the compact domed tomb beside Alai Darwaza.",
    mini_fact: "The tomb was added more than two centuries after the gateway beside it."
  },
  {
    id: 33, name: "Sanderson's Sundial", emoji: "☀️",
    lat: 28.5246, lng: 77.1858, radius: 36, xp: 350,
    arrival_fact: "You are at Sanderson's Sundial, a small modern-era memorial within the archaeological landscape. It commemorates Gordon Sanderson, an archaeologist closely associated with early conservation work at the Qutb complex.",
    direction_hint: "Walk east of the main mosque area and look for the low circular sundial memorial.",
    mini_fact: "The marker adds a conservation-history layer to the much older Sultanate monuments."
  },
  {
    id: 34, name: "Smith's Cupola", emoji: "🏛️",
    lat: 28.5242, lng: 77.1858, radius: 38, xp: 375,
    arrival_fact: "This freestanding cupola once crowned the Qutub Minar after a 19th-century repair by Major Robert Smith. Its style looked so different from the medieval tower that it was removed and placed here at ground level.",
    direction_hint: "Continue toward the garden display east-southeast of the minar.",
    mini_fact: "The displaced cupola is a visible lesson in how conservation ideas change over time."
  },
  {
    id: 35, name: "Minar's Angular Fluting", emoji: "🔺",
    lat: 28.5244, lng: 77.1854, radius: 34, xp: 400,
    arrival_fact: "Look closely at the Qutub Minar's lowest storey: alternating rounded and angular flutes make light and shadow ripple around the shaft. This texture helps the vast tower feel both powerful and finely carved.",
    direction_hint: "Return to the minar base and study the alternating grooves on the lowest red sandstone level.",
    mini_fact: "The lower storeys use different fluting patterns, making each stage visually distinct."
  },
  {
    id: 36, name: "Minar Inscription Bands", emoji: "✒️",
    lat: 28.5245, lng: 77.1854, radius: 34, xp: 425,
    arrival_fact: "Bands of carved Arabic inscriptions wrap around the minar like stone ribbons. They record patrons, repairs, and religious texts, turning the tower itself into a vertical historical document.",
    direction_hint: "Stand back from the tower and follow the dark carved bands spiralling between storeys.",
    mini_fact: "Inscription bands help historians distinguish construction and restoration phases."
  },
  {
    id: 37, name: "Minar Balconies", emoji: "⭕",
    lat: 28.5244, lng: 77.1856, radius: 36, xp: 450,
    arrival_fact: "Each storey ends in a projecting balcony supported by carved stone brackets. These rings interrupt the tower's taper, create dramatic shadow lines, and provide its unmistakable five-part silhouette.",
    direction_hint: "Tilt your view upward and count the projecting balconies dividing the tower.",
    mini_fact: "The minar rises 72.5 metres and narrows from about 14.3 metres at the base to 2.75 metres at the top."
  },
  {
    id: 38, name: "Restored Upper Storeys", emoji: "⚡",
    lat: 28.5243, lng: 77.1856, radius: 36, xp: 475,
    arrival_fact: "The upper levels tell a story of damage and repair. Lightning and earthquakes affected the minar, and rulers including Firoz Shah Tughlaq and Sikandar Lodi restored portions of the tower.",
    direction_hint: "Look from the red lower shaft toward the lighter upper levels and compare their materials.",
    mini_fact: "The visible changes in stone and style preserve several centuries of repair."
  },
  {
    id: 39, name: "Iltutmish Mosque Extension", emoji: "🧱",
    lat: 28.5249, lng: 77.1848, radius: 40, xp: 500,
    arrival_fact: "This section marks Iltutmish's early 13th-century enlargement of the Quwwat-ul-Islam Mosque. Expanding the court and screen transformed the first mosque into a much larger imperial complex.",
    direction_hint: "Trace the northern and western edges beyond the mosque's earliest courtyard.",
    mini_fact: "The mosque grew in stages as successive rulers used architecture to declare authority."
  },
  {
    id: 40, name: "Alauddin's Great Expansion", emoji: "🧭",
    lat: 28.5252, lng: 77.1846, radius: 46, xp: 525,
    arrival_fact: "Your final zone reveals Alauddin Khalji's plan to enlarge the mosque precinct on a monumental scale. The Alai Darwaza, madrasa, tomb, and unfinished Alai Minar are surviving fragments of that bold, incomplete vision.",
    direction_hint: "Stand where the mosque extension, madrasa ruins, and Alai Minar can be read as one connected plan.",
    mini_fact: "The unfinished works make the complex a record of ambition interrupted, not a single frozen monument."
  }
]

// ── KONARK SUN TEMPLE ZONES ──────────────────────────────
const KONARK_ZONES = [
  {
    id: 31, name: "Entrance Gate", emoji: "🚪",
    lat: 19.88712, lng: 86.09486, radius: 50, xp: 50,
    arrival_fact: "You are at the entrance to the Konark Sun Temple complex, where the vast stone chariot of Surya, the Sun God, first comes into view. Built in the 13th century by King Narasimhadeva I, this UNESCO World Heritage site was designed as a cosmic calendar carved in stone.",
    direction_hint: "Walk through the main approach path toward the monumental stone temple platform.",
    mini_fact: "Konark comes from Kona (corner) and Arka (sun), meaning the Sun of the corner.",
    local_belief: "Sailors along the Odisha coast called this the Black Pagoda - legend holds that powerful lodestones built into the temple walls were so strong they threw off ship compasses for miles out at sea."
  },
  {
    id: 32, name: "Main Chariot Wheel", emoji: "🛞",
    lat: 19.88746, lng: 86.09478, radius: 45, xp: 75,
    arrival_fact: "You are beside one of Konark's giant stone wheels, each carved with spokes, floral motifs, and miniature figures. These wheels are not just decoration: they symbolize the Sun God's celestial chariot and are often read as precision sundials that track the movement of time through shadow.",
    direction_hint: "Move along the outer temple wall and look for the massive carved wheel rising from the plinth.",
    mini_fact: "The temple features 24 wheels, often linked to the 24 hours of the day.",
    local_belief: "Locals believe Surya's chariot never truly stopped - at the exact moment of winter solstice dawn, the first ray of sunlight strikes the idol's crown, and those present are said to receive a flash of divine sight."
  },
  {
    id: 33, name: "Natya Mandapa (Dance Hall)", emoji: "💃",
    lat: 19.88750, lng: 86.09496, radius: 45, xp: 100,
    arrival_fact: "You are standing at the Natya Mandapa, the dance pavilion where ritual performance once animated the temple precinct. Its pillars and walls are carved with musicians and dancers, offering a remarkable record of movement, costume, and devotion in medieval Odisha.",
    direction_hint: "Head toward the pillared platform in front of the main shrine complex.",
    mini_fact: "Many dance poses here are studied in relation to the Odissi classical tradition."
  },
  {
    id: 34, name: "Jagamohana (Porch)", emoji: "🏛️",
    lat: 19.88756, lng: 86.09500, radius: 45, xp: 125,
    arrival_fact: "You have reached the Jagamohana, the great assembly porch that still dominates the skyline at Konark. Its heavy, tiered mass and dense sculptural bands show the Kalinga style at monumental scale, designed to draw pilgrims inward toward the sacred core.",
    direction_hint: "Walk up toward the tallest surviving structure at the center of the complex.",
    mini_fact: "Jagamohana means assembly hall, where devotees gathered before the sanctum.",
    local_belief: "The most ancient legend behind Konark's very existence begins with Samba, the son of Krishna. Samba mocked the sage Narada, who cursed him with leprosy as punishment for his arrogance. For twelve years Samba performed intense penance at the Mitravana forest on the banks of the Chandrabhaga river - exactly where Konark stands today. Surya, the Sun God, was so moved by his devotion that he appeared and cured Samba completely. In gratitude, Samba built this entire temple to honor Surya - making the Sun Temple not just an architectural achievement, but a monument born from a son's suffering, a curse, and a miracle."
  },
  {
    id: 35, name: "Deul (Main Tower Ruins)", emoji: "🧱",
    lat: 19.88764, lng: 86.09504, radius: 45, xp: 150,
    arrival_fact: "You are near the remains of the Deul, the original sanctum tower that once soared above Konark. Though the main tower collapsed centuries ago, its surviving base and scattered stonework still reveal the immense ambition of the original temple plan.",
    direction_hint: "Move to the rear core of the temple where the sanctum once stood.",
    mini_fact: "Early records suggest the original tower may have risen over 60 meters.",
    local_belief: "Locals believe the original Surya idol floated in mid-air, suspended by lodestones hidden in the walls and ceiling with no physical support. When Portuguese sailors removed the central magnet, the magnetic balance collapsed - and so did the tower."
  },
  {
    id: 36, name: "Lion-Elephant-Human Sculpture", emoji: "🦁",
    lat: 19.88742, lng: 86.09488, radius: 40, xp: 175,
    arrival_fact: "You are at Konark's iconic guardian sculpture: a lion crushing an elephant, with a human figure pinned beneath. The carving is both dramatic and symbolic - the lion represents royal power, the elephant stands for wealth and brute strength, and the human below signifies the common person pressed under both forces. This stark hierarchy in stone is one of the temple's most photographed and discussed images.",
    direction_hint: "Look beside the temple stairways for the monumental paired statues flanking the approach.",
    mini_fact: "Each composition was carved from a single stone mass to maximize visual impact.",
    local_belief: "Legend tells of Dharmapada, the 12-year-old son of the chief architect, who leapt from the top of the completed tower at dawn - his sacrifice was said to be the only act that could release the craftsmen from execution after years of failed construction."
  },
  {
    id: 37, name: "Konark Museum", emoji: "🏺",
    lat: 19.88806, lng: 86.09462, radius: 50, xp: 200,
    arrival_fact: "You have arrived at the site museum, where rescued sculptures and architectural fragments are preserved away from weathering. Here you can study details up close that are difficult to see on the high temple walls.",
    direction_hint: "Follow the pathway toward the museum complex near the temple grounds.",
    mini_fact: "The museum helps conserve original carvings while replicas protect key outdoor views."
  },
  {
    id: 38, name: "Sun Terrace", emoji: "🌞",
    lat: 19.88800, lng: 86.09540, radius: 55, xp: 225,
    arrival_fact: "You are on an open terrace facing the eastern sky, where Konark's solar geometry is easiest to appreciate at dawn and dusk. From here the temple's wheel, horse, and chariot symbolism align into a single vision of motion, light, and cosmic time.",
    direction_hint: "Walk to the elevated open edge of the complex with a broad view of the temple silhouette.",
    mini_fact: "Konark was intentionally oriented to greet the first rays of the rising sun.",
    local_belief: "Locals believe Surya's chariot never truly stopped - at the exact moment of winter solstice dawn, the first ray of sunlight strikes the idol's crown, and those present are said to receive a flash of divine sight."
  },
  {
    id: 39, name: "Aruna Stambha", emoji: "🗿",
    lat: 19.88718, lng: 86.09492, radius: 45, xp: 250,
    arrival_fact: "You are at the remembered location of the Aruna Stambha, the towering monolithic chlorite pillar that once stood before Konark's entrance. The pillar was crowned by Aruna, the charioteer of Surya, announcing the temple's solar identity even before devotees entered the complex. In the 18th century, the column was relocated to the Jagannath Temple precinct at Puri, where it still stands at the Lion Gate. Its journey links two of Odisha's most sacred ritual landscapes.",
    direction_hint: "Pause near the forecourt axis and imagine the original ceremonial line leading into the temple.",
    mini_fact: "Aruna Stambha is among the finest surviving chlorite monoliths from medieval Odisha.",
    local_belief: "Sailors along the Odisha coast called this the Black Pagoda - legend holds that powerful lodestones built into the temple walls were so strong they threw off ship compasses for miles out at sea."
  },
  {
    id: 40, name: "Seven Horses", emoji: "🐎",
    lat: 19.88748, lng: 86.09468, radius: 45, xp: 275,
    arrival_fact: "You are viewing the sculpted horses that pull Surya's stone chariot across the temple facade. The canonical set of seven symbolizes the days of the week and the rhythmic cycle of time driven by the sun. Their straining posture gives the architecture a sense of forward motion, as if the entire monument is surging eastward. This kinetic imagery is central to Konark's cosmic storytelling.",
    direction_hint: "Move along the platform edge and look for the projecting horse sculptures attached to the chariot base.",
    mini_fact: "Konark's horses and wheels together transform the temple into a complete celestial vehicle."
  },
  {
    id: 41, name: "North Face Chariot Wheels", emoji: "🧭",
    lat: 19.88758, lng: 86.09476, radius: 45, xp: 300,
    arrival_fact: "You have reached the north elevation, where the great stone wheels are deeply carved with spokes, hubs, and figurative bands. These wheels are often interpreted as sundials, with shadow positions indicating approximate time during parts of the day. The precision of geometry and ornament demonstrates how astronomy, ritual, and art merged in Kalinga architecture. Standing here, you can read time as sculpture.",
    direction_hint: "Walk to the northern side of the main structure and locate the large radial carvings at plinth level.",
    mini_fact: "Each major wheel has eight principal spokes commonly linked to the prahars of the day.",
    local_belief: "Locals believe Surya's chariot never truly stopped - at the exact moment of winter solstice dawn, the first ray of sunlight strikes the idol's crown, and those present are said to receive a flash of divine sight."
  },
  {
    id: 42, name: "South Face Chariot Wheels", emoji: "🕰️",
    lat: 19.88738, lng: 86.09476, radius: 45, xp: 325,
    arrival_fact: "You are now at the south elevation wheels, where sun angle and shadow behavior differ from the north side. Craftsmen used orientation and depth of carving to create readable shadow edges across the spokes. Comparing both sides reveals how the monument engages changing light through the day. Konark thus functions not only as a shrine but as a sophisticated stone instrument of solar observation.",
    direction_hint: "Continue around the main platform to the southern face and compare wheel shadows with the opposite side.",
    mini_fact: "Guides often demonstrate time-reading techniques here using spoke intersections and rim shadows.",
    local_belief: "Locals believe Surya's chariot never truly stopped - at the exact moment of winter solstice dawn, the first ray of sunlight strikes the idol's crown, and those present are said to receive a flash of divine sight."
  },
  {
    id: 43, name: "Erotic Sculpture Panels (Kama Panels)", emoji: "🪷",
    lat: 19.88754, lng: 86.09516, radius: 45, xp: 350,
    arrival_fact: "You are in front of Konark's celebrated kama or mithuna panels, where intimate human forms are carved with extraordinary confidence and detail. In medieval temple thought, these images are not merely sensual decoration but part of a wider vision of life, fertility, auspiciousness, and the union of energies. Many scholars also read them through tantric symbolism, where worldly experience and spiritual ascent are not opposed but interlinked. Their placement within sacred architecture reflects a holistic philosophy of existence.",
    direction_hint: "Look along the sculptural bands on the outer walls, especially near transitional zones between major architectural elements.",
    mini_fact: "Konark's figurative program ranges from courtly life to divine iconography, making it unusually encyclopedic."
  },
  {
    id: 44, name: "Navagraha Slab", emoji: "🪐",
    lat: 19.88732, lng: 86.09494, radius: 40, xp: 375,
    arrival_fact: "You are at the Navagraha panel, where nine planetary deities are carved in a single monumental slab. Such placements above or near gateways invoked cosmic balance before entry into the sacred interior. The ensemble reflects the importance of jyotisha, ritual timing, and celestial order in temple worship. At Konark, this planetary register reinforces the monument's deep solar and astronomical symbolism.",
    direction_hint: "Move toward the upper doorway zone and scan for a long carved frieze featuring nine seated or standing deities.",
    mini_fact: "Navagraha imagery is common in Odisha temples but Konark's treatment is among the most dramatic."
  },
  {
    id: 45, name: "Chlorite Surya Statues", emoji: "☀️",
    lat: 19.88760, lng: 86.09524, radius: 45, xp: 400,
    arrival_fact: "You are facing the famed chlorite images of Surya, carved in high relief with regal boots, ornaments, and attendants. The temple preserves distinct Sun God aspects associated with different moments of the day, often interpreted as dawn, midday, and dusk manifestations. Their polished stone, iconographic clarity, and frontal authority make them central to Konark's theological program. These figures anchor the monument's identity as a dedicated solar shrine.",
    direction_hint: "Look for the large dark-stone Surya images set into wall niches on different sides of the main structure.",
    mini_fact: "The Surya icons are notable for foreign-style boots, a rare feature in Indian temple sculpture."
  },
  {
    id: 46, name: "Musicians Gallery", emoji: "🎶",
    lat: 19.88752, lng: 86.09532, radius: 45, xp: 425,
    arrival_fact: "You are at a sculptural stretch often called the Musicians Gallery, crowded with apsaras, gandharvas, and instrumental performers. Drums, string instruments, and dance gestures are rendered so vividly that the stone seems to carry rhythm. These carvings testify that music and movement were integral to temple ritual culture, not peripheral ornament. Konark preserves one of the richest visual archives of performance traditions in medieval eastern India.",
    direction_hint: "Raise your view to the upper narrative tiers and trace sequences of dancer and musician figures.",
    mini_fact: "Iconographers use these panels to study historical instrument forms and ensemble practices."
  },
  {
    id: 47, name: "Eastern Entrance", emoji: "🌅",
    lat: 19.88714, lng: 86.09514, radius: 50, xp: 450,
    arrival_fact: "You are at the eastern ceremonial approach, historically aligned with the rising sun and pilgrim movement. Processional entry from this direction reinforced the temple's solar orientation and ritual drama at dawn. Architectural sequencing here guided worshippers from worldly space into progressively sanctified zones. The axis embodies Konark's fusion of cosmology, choreography, and stone planning.",
    direction_hint: "Follow the east-west axis and stand where the pathway opens toward the principal facade.",
    mini_fact: "Sun-oriented temple planning is a defining hallmark of Konark's design logic.",
    local_belief: "The night before invaders reached Konark, the last priest Dadhihaman is said to have carried the sacred Surya idol away to Puri under cover of darkness. It was never returned."
  },
  {
    id: 48, name: "Bhog Mandapa (Kitchen Ruins)", emoji: "🍲",
    lat: 19.88792, lng: 86.09518, radius: 45, xp: 475,
    arrival_fact: "You are at the remains identified as the Bhog Mandapa area, associated with preparation and offering of ritual food. Large temple complexes depended on such service structures to sustain daily worship, festivals, and feeding traditions. Even in ruin, this zone reveals that sacred architecture included practical systems of labor, storage, and distribution. It is a reminder that devotion here was both ceremonial and deeply material.",
    direction_hint: "Walk toward the peripheral ruined blocks near the main ceremonial core and look for low structural remnants.",
    mini_fact: "Temple kitchens in Odisha were major institutional spaces supporting large pilgrim economies."
  },
  {
    id: 49, name: "Mayadevi Temple", emoji: "🛕",
    lat: 19.88808, lng: 86.09498, radius: 45, xp: 500,
    arrival_fact: "You are at the Mayadevi Temple, a secondary shrine within the Konark complex linked to one of Surya's consorts in local tradition. Its presence demonstrates that the sacred landscape here was plural, with subsidiary cults coexisting around the main solar monument. Archaeological and iconographic evidence suggests this shrine had an important ritual role rather than being a minor afterthought. Together, the structures create a layered temple ecosystem.",
    direction_hint: "Move to the smaller freestanding shrine zone inside the broader compound, slightly away from the main jagamohana mass.",
    mini_fact: "Mayadevi is often associated with the wider family and retinue traditions around Surya worship."
  },
  {
    id: 50, name: "Vaishnava Shrine", emoji: "🙏",
    lat: 19.88796, lng: 86.09482, radius: 45, xp: 525,
    arrival_fact: "You are near the Vaishnava shrine remains, a key indicator that Konark's precinct carried multiple devotional strands over time. The presence of Vishnu-linked worship elements within a predominantly Surya complex reflects the fluid, layered practice of medieval Indian religion. Rather than rigid sectarian boundaries, the site records interaction, adaptation, and shared sacred geography. This makes Konark not just a single-purpose monument, but a living palimpsest of belief.",
    direction_hint: "Look for the smaller shrine footprint within the compound that differs from the main solar iconographic sequence.",
    mini_fact: "Konark's compound history reveals centuries of ritual overlap, reuse, and reinterpretation."
  }
]

const GOLDEN_TEMPLE_ZONES = [
  {
    id: 51, name: 'Darshani Deori Entrance', emoji: '🚪',
    lat: 31.61986, lng: 74.87618, radius: 45, xp: 75,
    arrival_fact: 'You are at Darshani Deori, the ceremonial gateway opening toward the sacred pool and Harmandir Sahib. The view is intentionally framed so the gold-clad sanctum appears to float at the center of the Amrit Sarovar. Visitors pause here, cover their heads, and enter with quiet respect.',
    direction_hint: 'Walk through the main gateway and continue toward the marble parikrama surrounding the sacred pool.',
    mini_fact: 'The gateway creates one of the most recognizable first views of the Golden Temple.',
  },
  {
    id: 52, name: 'Amrit Sarovar Parikrama', emoji: '💧',
    lat: 31.61972, lng: 74.87652, radius: 42, xp: 100,
    arrival_fact: 'You are beside the Amrit Sarovar, the sacred pool around which the complex developed. Pilgrims walk the marble parikrama in contemplation while the water reflects the sanctum, sky, and surrounding arcades. The open circulation expresses the Sikh principles of equality, humility, and shared devotion.',
    direction_hint: 'Follow the marble walkway clockwise around the pool toward the causeway leading to Harmandir Sahib.',
    mini_fact: 'The city name Amritsar is closely connected with the sacred pool, Amrit Sarovar.',
  },
  {
    id: 53, name: 'Guru’s Bridge Causeway', emoji: '🌉',
    lat: 31.61958, lng: 74.87676, radius: 38, xp: 125,
    arrival_fact: 'You are approaching Harmandir Sahib along the narrow causeway often called Guru’s Bridge. The path crosses the sacred water and leads to the sanctum, where verses from the Guru Granth Sahib are sung in continuous kirtan. Move calmly and keep the passage clear for other visitors.',
    direction_hint: 'Join the causeway queue and proceed respectfully toward the gold-clad sanctum at the center of the pool.',
    mini_fact: 'The sanctum is reached across water, turning the approach into a gradual transition from public space to devotion.',
  },
  {
    id: 54, name: 'Langar Hall', emoji: '🍲',
    lat: 31.62018, lng: 74.87602, radius: 48, xp: 150,
    arrival_fact: 'You are near the Guru Ram Das Langar, the community kitchen where visitors of every faith and background sit together and receive a free meal. Volunteers prepare, serve, and clean throughout the day. This living institution makes seva, equality, and hospitality tangible at an extraordinary scale.',
    direction_hint: 'Leave the pool-side walkway toward the community kitchen signs and join the orderly langar entrance line.',
    mini_fact: 'Everyone sits together on the floor in pangat, without distinction of status or background.',
  },
]

const MONUMENT_ZONES: Record<string, typeof TAJ_ZONES> = {
  'taj-mahal': TAJ_ZONES,
  'red-fort': RED_FORT_ZONES,
  'qutub-minar': QUTUB_MINAR_ZONES,
  'konark': KONARK_ZONES,
  'golden-temple': GOLDEN_TEMPLE_ZONES,
}

/** Places every monument's demo waypoints in a deterministic spiral around
 * the supplied Chandigarh demo anchor, while retaining the monument content. */
function buildNearbyDemoZones(zones: typeof TAJ_ZONES): typeof TAJ_ZONES {
  const metersPerLatitudeDegree = 111_320
  const metersPerLongitudeDegree = metersPerLatitudeDegree * Math.cos(DEMO_ANCHOR.lat * Math.PI / 180)
  return zones.map((zone, index) => {
    if (index === 0) return { ...zone, lat: DEMO_ANCHOR.lat, lng: DEMO_ANCHOR.lng }
    const spiralIndex = index - 1
    const ring = Math.floor(spiralIndex / 6)
    const slot = spiralIndex % 6
    const radiusMeters = 35 + ring * 28
    const angleRadians = (slot * 60 + ring * 25) * Math.PI / 180
    const northMeters = Math.cos(angleRadians) * radiusMeters
    const eastMeters = Math.sin(angleRadians) * radiusMeters
    return {
      ...zone,
      lat: DEMO_ANCHOR.lat + northMeters / metersPerLatitudeDegree,
      lng: DEMO_ANCHOR.lng + eastMeters / metersPerLongitudeDegree,
    }
  }) as typeof TAJ_ZONES
}

function getBearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const dLng = (to.lng - from.lng) * Math.PI / 180
  const lat1 = from.lat * Math.PI / 180
  const lat2 = to.lat * Math.PI / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

// ── LEAFLET MAP (dynamic, no SSR) ────────────────────────
const ExploreMap = dynamic(() => Promise.resolve(function ExploreMapInner({
  zones, currentZoneIndex, completedZones, userPos, monumentId
}: {
  zones: typeof TAJ_ZONES; currentZoneIndex: number;
  completedZones: number[]; userPos: { lat: number; lng: number };
  monumentId: string;
}) {
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<any[]>([])
  const lastMonumentRef = useRef<string>('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    const L = require('leaflet')
    if (!containerRef.current) return

    // Destroy map if monument changed
    if (mapRef.current && lastMonumentRef.current !== monumentId) {
      mapRef.current.remove()
      mapRef.current = null
    }
    lastMonumentRef.current = monumentId

    // Use first zone as center
    const centerLat = zones[0]?.lat ?? 27.17460
    const centerLng = zones[0]?.lng ?? 78.04215

    if (mapRef.current) {
      markersRef.current.forEach(m => mapRef.current!.removeLayer(m))
      markersRef.current = []
    } else {
      mapRef.current = L.map(containerRef.current, {
        center: [centerLat, centerLng], zoom: 17,
        zoomControl: false, attributionControl: false,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapRef.current)
      L.control.zoom({ position: 'topright' }).addTo(mapRef.current)
    }
    // Keep the synthetic user and active coordinate visible together.
    const activeZone = zones[currentZoneIndex]
    if (activeZone) {
      mapRef.current.invalidateSize()
      const routeBounds = L.latLngBounds([
        [userPos.lat, userPos.lng],
        [activeZone.lat, activeZone.lng],
      ])
      if (routeBounds.isValid()) {
        mapRef.current.fitBounds(routeBounds, { padding: [54, 84], maxZoom: 18, animate: false })
      }
    }

    const map = mapRef.current!
    const newMarkers: any[] = []

    // Path line connecting zones
    const pathCoords = zones.map(z => [z.lat, z.lng])
    const polyline = L.polyline(pathCoords, {
      color: '#C9A84C', weight: 2, dashArray: '8 6', opacity: 0.6
    }).addTo(map)
    newMarkers.push(polyline)

    // Zone markers
    zones.forEach((zone, i) => {
      const isActive = i === currentZoneIndex
      const isComplete = completedZones.includes(zone.id)
      const isFuture = !isActive && !isComplete

      const marker = L.circleMarker([zone.lat, zone.lng], {
        radius: isActive ? 14 : 10,
        fillColor: isComplete ? '#4B9B8E' : isActive ? '#C9A84C' : '#555',
        color: isComplete ? '#4B9B8E' : isActive ? '#C9A84C' : '#777',
        fillOpacity: isActive ? 0.9 : 0.7,
        weight: isActive ? 3 : 1,
        className: isActive ? 'pulse-marker' : ''
      }).addTo(map)

      marker.bindPopup(`<b style="color:#333">${zone.emoji} ${zone.name}</b><br/><span style="color:#666">${isComplete ? '✅ Completed' : isFuture ? '🔒 Locked' : '📍 Current'}</span>`)
      newMarkers.push(marker)

      // Label
      const label = L.marker([zone.lat, zone.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="font-size:18px;text-align:center;margin-top:-30px">${isComplete ? '✅' : zone.emoji}</div>`,
          iconSize: [30, 30],
        })
      }).addTo(map)
      newMarkers.push(label)
    })

    // User marker
    const userMarker = L.circleMarker([userPos.lat, userPos.lng], {
      radius: 8, fillColor: '#fff', color: '#C9A84C',
      fillOpacity: 1, weight: 3
    }).addTo(map)
    userMarker.bindPopup('<b style="color:#333">📍 You</b>')
    newMarkers.push(userMarker)

    const youLabel = L.marker([userPos.lat, userPos.lng], {
      icon: L.divIcon({
        className: '',
        html: '<div style="font-size:11px;color:#C9A84C;font-weight:700;text-align:center;margin-top:8px">You</div>',
        iconSize: [40, 20],
      })
    }).addTo(map)
    newMarkers.push(youLabel)

    markersRef.current = newMarkers
  }, [zones, currentZoneIndex, completedZones, userPos, monumentId])

  useEffect(() => () => {
    mapRef.current?.remove()
    mapRef.current = null
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0c1824]" aria-label="Coordinate route map">
      <div ref={containerRef} className="absolute inset-0" />
      <style>{`.pulse-marker { animation: markerPulse 1.5s ease infinite; } @keyframes markerPulse { 0%,100% { opacity: 0.9; } 50% { opacity: 0.5; } }`}</style>
    </div>
  )
}), { ssr: false })

// ── MAIN EXPLORER PAGE ───────────────────────────────────
export default function ExplorePage() {
  const router = useRouter()
  const { user, setProfile } = useAuth()
  const { lang } = useLang()
  const [hasMounted, setHasMounted] = useState(false)

  const [currentZoneIndex, setCurrentZoneIndex] = useState(0)
  const [arrivedAtZone, setArrivedAtZone] = useState(false)
  const [completedZones, setCompletedZones] = useState<number[]>([])
  const [showFact, setShowFact] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [explorerComplete, setExplorerComplete] = useState(false)
  const [arViewActive, setArViewActive] = useState(false)
  const [viewMode, setViewMode] = useState<ExploreViewMode>('demo-map')
  const [userPos, setUserPos] = useState(FIXED_DEMO_START)
  const [isTTSSpeaking, setIsTTSSpeaking] = useState(false)
  const [narrationReady, setNarrationReady] = useState(false)
  const [narrationLoading, setNarrationLoading] = useState(false)
  const [currentTranslation, setCurrentTranslation] = useState<GuideTranslation | null>(null)
  const [translationLoading, setTranslationLoading] = useState(false)
  const { muted, toggleMute } = useYatrikControls()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const narrationRequestRef = useRef<AbortController | null>(null)
  // Bumped whenever narration is cancelled/restarted, so an in-flight native
  // narration request from a previous zone can no longer apply its result.
  const nativeNarrationTokenRef = useRef(0)
  // Tracks the on-device speech fallback (window.speechSynthesis) lifecycle
  // separately from the server-audio path, since iOS Safari frequently
  // blocks or silently fails speech synthesis unless it's triggered by a
  // direct, synchronous tap — 'failed' lets the manual Play button retry
  // with a fresh gesture instead of resuming a dead utterance.
  const browserTTSStateRef = useRef<'idle' | 'speaking' | 'paused' | 'failed'>('idle')
  // Last narration text/language attempted, so a manual retry (a genuine
  // user gesture, which iOS is far more permissive about) can re-run it.
  const pendingNarrationRef = useRef<{ text: string; language: SupportedLanguage } | null>(null)
  const activeNarrationKeyRef = useRef<string | null>(null)
  const translationCacheRef = useRef<Record<string, GuideTranslation>>({})

  const [exploreMonumentId, setExploreMonumentId] = useState('taj-mahal')
  const monumentSelected = true // always start directly into explore
  const [customMonumentName, setCustomMonumentName] = useState<string | null>(null)
  const [customZones, setCustomZones] = useState<CustomZone[]>([])

  const monumentsList = useMemo(() => {
    const base = Object.keys(MONUMENT_ZONES).map(id => ({ id, name: MONUMENT_NAMES[id] || id }))
    if (customMonumentName && customZones.length > 0) {
      base.push({ id: DEMO_MONUMENT_ID, name: customMonumentName })
    }
    return base
  }, [customMonumentName, customZones.length])

  // Custom (demo) monuments recorded on-device via /explore/create take
  // priority when selected — same shape as the built-in zone data, so the
  // rest of this page doesn't need to know the difference.
  const activeZones: typeof TAJ_ZONES = (
    exploreMonumentId === DEMO_MONUMENT_ID && customZones.length > 0
      ? customZones
      : MONUMENT_ZONES[exploreMonumentId] || TAJ_ZONES
  ) as typeof TAJ_ZONES

  const demoZones = useMemo(() => buildNearbyDemoZones(activeZones), [activeZones])
  const displayedZones = arViewActive ? activeZones : demoZones
  const zone = displayedZones[currentZoneIndex]
  const liveZone = activeZones[currentZoneIndex]
  const bearing = getBearing(userPos, { lat: zone.lat, lng: zone.lng })

  // Note: this is unrelated to the page-level `demoMode` synthetic-walk banner
  // above — arNav defaults to attempting real permissions/GPS/camera, and is
  // only engaged when the user explicitly taps "Try Live AR Camera".
  const arNav = useARNavigation({
    zone: { lat: liveZone.lat, lng: liveZone.lng, radius: liveZone.radius },
    demoHeadingReference: DEMO_ANCHOR,
  })

  useEffect(() => {
    setHasMounted(true)
    try {
      const cached = localStorage.getItem(GUIDE_TRANSLATION_STORAGE_KEY)
      if (cached) translationCacheRef.current = JSON.parse(cached)
    } catch {
      translationCacheRef.current = {}
    }
  }, [])

  useEffect(() => {
    const custom = getCustomMonument(DEMO_MONUMENT_ID)
    if (custom && custom.zones.length > 0) {
      setCustomMonumentName(custom.name)
      setCustomZones(custom.zones)
    }
  }, [])

  useEffect(() => {
    saveMonument('taj-mahal', MONUMENT_NAMES['taj-mahal'])
  }, [])

  const stopNarration = useCallback(() => {
    nativeNarrationTokenRef.current += 1
    activeNarrationKeyRef.current = null
    narrationRequestRef.current?.abort()
    narrationRequestRef.current = null
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    if (browserTTSStateRef.current !== 'idle' && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    browserTTSStateRef.current = 'idle'
    setIsTTSSpeaking(false)
    setNarrationReady(false)
  }, [])

  // Speaks via the browser's built-in speech synthesis. Used when the
  // server-generated narration audio is unavailable, so the guided tour
  // still narrates without depending on any external TTS service. iOS
  // Safari is strict about requiring a direct, synchronous user gesture
  // for this API — a call made after an awaited fetch (as happens on the
  // automatic path) can silently fail there. onerror leaves state
  // 'failed' with narrationReady so the manual Play button can retry
  // from directly inside a tap, which iOS does allow.
  const speakWithBrowserFallback = useCallback((text: string, language: SupportedLanguage) => {
    pendingNarrationRef.current = { text, language }

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      browserTTSStateRef.current = 'idle'
      setIsTTSSpeaking(false)
      setNarrationReady(false)
      return
    }
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = getLanguageConfig(language).locale
    utterance.rate = 0.95
    utterance.onend = () => {
      browserTTSStateRef.current = 'idle'
      setIsTTSSpeaking(false)
      setNarrationReady(false)
    }
    utterance.onerror = () => {
      browserTTSStateRef.current = 'failed'
      setIsTTSSpeaking(false)
      setNarrationReady(true)
    }

    browserTTSStateRef.current = 'speaking'
    setIsTTSSpeaking(true)
    setNarrationReady(false)
    window.speechSynthesis.speak(utterance)
  }, [])

  const pauseNarration = useCallback(() => {
    if (browserTTSStateRef.current === 'speaking' && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause()
      browserTTSStateRef.current = 'paused'
      setIsTTSSpeaking(false)
      setNarrationReady(true)
      return
    }
    const audio = audioRef.current
    if (!audio) {
      narrationRequestRef.current?.abort()
      narrationRequestRef.current = null
      setIsTTSSpeaking(false)
      setNarrationReady(false)
      return
    }
    audio.pause()
    setIsTTSSpeaking(false)
    setNarrationReady(true)
  }, [])

  const playPreparedNarration = useCallback(async () => {
    if (browserTTSStateRef.current === 'paused' && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume()
      browserTTSStateRef.current = 'speaking'
      setIsTTSSpeaking(true)
      setNarrationReady(false)
      return
    }
    if (browserTTSStateRef.current === 'failed' && pendingNarrationRef.current) {
      // Fresh attempt from directly inside this tap — the direct gesture
      // iOS requires to allow speech synthesis.
      speakWithBrowserFallback(pendingNarrationRef.current.text, pendingNarrationRef.current.language)
      return
    }
    const audio = audioRef.current
    if (!audio) return

    try {
      if (audio.ended) audio.currentTime = 0
      setNarrationReady(false)
      setIsTTSSpeaking(true)
      await audio.play()
    } catch (error) {
      console.warn('Narration playback needs a user gesture:', error)
      setIsTTSSpeaking(false)
      setNarrationReady(true)
    }
  }, [speakWithBrowserFallback])

  const fetchNarration = useCallback((
    text: string,
    language: SupportedLanguage,
    signal?: AbortSignal,
  ) => fetch('/api/narrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, monumentId: exploreMonumentId, language }),
    signal,
  }), [exploreMonumentId])

  const getGuideTranslation = useCallback(async (
    monumentId: string,
    guideZone: { id: number; direction_hint: string; arrival_fact: string; mini_fact: string },
  ): Promise<GuideTranslation | null> => {
    const cacheKey = `${lang}:${monumentId}:${guideZone.id}`
    const cached = translationCacheRef.current[cacheKey]
    if (cached) return cached

    try {
      const source = {
        directionHint: guideZone.direction_hint,
        arrivalFact: guideZone.arrival_fact,
        miniFact: guideZone.mini_fact,
      }
      let translation: GuideTranslation
      if (hasNativeNvidia()) {
        translation = await translateExploreGuideNative(source, lang)
      } else {
        const response = await fetch('/api/explore-translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: lang, monumentId, ...source }),
        })
        if (!response.ok) throw new Error('Guide translation unavailable')
        translation = await response.json() as GuideTranslation
      }
      translationCacheRef.current[cacheKey] = translation
      try {
        localStorage.setItem(
          GUIDE_TRANSLATION_STORAGE_KEY,
          JSON.stringify(translationCacheRef.current),
        )
      } catch {
        // In-memory translation still works when storage is unavailable.
      }
      return translation
    } catch {
      return null
    }
  }, [lang])

  // Narration stays behind the app API; the browser never talks to the
  // upstream provider or receives provider credentials.
  const speakFact = useCallback(async (
    text: string,
    language: SupportedLanguage = lang,
  ) => {
    const narrationKey = `${language}:${text}`
    if (activeNarrationKeyRef.current === narrationKey) return
    stopNarration()
    activeNarrationKeyRef.current = narrationKey

    if (muted) {
      activeNarrationKeyRef.current = null
      return
    }

    // Inside the bundled Android APK there is no live Next.js server for
    // /api/narrate (ElevenLabs/Chatterbox) to reach — narrate via the
    // native NVIDIA bridge instead, falling back to on-device speech
    // synthesis (tagged as the Android system voice) if that fails.
    if (isBundledAndroidApp()) {
      const speakWithAndroidVoice = () => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = getLanguageConfig(language).locale
        utterance.rate = 0.92
        utterance.onstart = () => {
          setNarrationReady(false)
          setIsTTSSpeaking(true)
        }
        utterance.onend = () => {
          setIsTTSSpeaking(false)
          setNarrationReady(true)
        }
        utterance.onerror = () => {
          setIsTTSSpeaking(false)
          setNarrationReady(false)
        }
        window.speechSynthesis.speak(utterance)
      }

      const narrationVoice = getNvidiaNarrationVoice(exploreMonumentId, language)
      if (!narrationVoice) {
        speakWithAndroidVoice()
        return
      }

      const requestToken = nativeNarrationTokenRef.current
      setNarrationLoading(true)
      try {
        const audioBase64 = await synthesizeNarrationNative(
          text,
          narrationVoice.language,
          narrationVoice.voice,
        )
        if (nativeNarrationTokenRef.current !== requestToken) return
        const binary = window.atob(audioBase64)
        const bytes = new Uint8Array(binary.length)
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index)
        }
        const audioUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }))
        const audio = new Audio(audioUrl)
        audioRef.current = audio
        audioUrlRef.current = audioUrl
        audio.onplay = () => {
          setNarrationLoading(false)
          setNarrationReady(false)
          setIsTTSSpeaking(true)
        }
        audio.onended = () => {
          audio.currentTime = 0
          activeNarrationKeyRef.current = null
          setIsTTSSpeaking(false)
          setNarrationReady(true)
        }
        audio.onerror = () => {
          if (nativeNarrationTokenRef.current !== requestToken || audioRef.current !== audio) return
          setNarrationLoading(false)
          setIsTTSSpeaking(false)
          setNarrationReady(false)
          speakWithAndroidVoice()
        }
        try {
          await audio.play()
        } catch {
          setNarrationLoading(false)
          setNarrationReady(true)
        }
      } catch (error) {
        if (nativeNarrationTokenRef.current !== requestToken) return
        console.warn('NVIDIA neural narration failed; using Android voice:', error)
        setNarrationLoading(false)
        speakWithAndroidVoice()
      }
      return
    }

    const controller = new AbortController()
    narrationRequestRef.current = controller
    setIsTTSSpeaking(true)
    setNarrationReady(false)

    try {
      const response = await fetchNarration(text, language, controller.signal)
      if (!response.ok) throw new Error('Narration API unavailable')

      const blob = await response.blob()
      if (controller.signal.aborted) return

      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audioUrlRef.current = audioUrl

      const finish = () => {
        if (audioRef.current !== audio) return
        audio.currentTime = 0
        activeNarrationKeyRef.current = null
        setIsTTSSpeaking(false)
        setNarrationReady(true)
      }

      const fail = () => {
        if (audioRef.current === audio) audioRef.current = null
        if (audioUrlRef.current === audioUrl) {
          URL.revokeObjectURL(audioUrl)
          audioUrlRef.current = null
        }
        setIsTTSSpeaking(false)
        setNarrationReady(false)
        activeNarrationKeyRef.current = null
      }

      audio.onended = finish
      audio.onerror = fail
      try {
        await audio.play()
      } catch (error) {
        // Slow synthesis can outlive the browser's transient autoplay grant.
        // Keep the generated audio ready for the explicit Play button.
        console.warn('Automatic narration playback was blocked:', error)
        setIsTTSSpeaking(false)
        setNarrationReady(audioRef.current === audio)
      }
    } catch (error) {
      if (controller.signal.aborted) return
      console.warn('Server narration unavailable, using on-device speech:', error)
      speakWithBrowserFallback(text, language)
    } finally {
      if (narrationRequestRef.current === controller) {
        narrationRequestRef.current = null
      }
    }
  }, [exploreMonumentId, fetchNarration, lang, muted, speakWithBrowserFallback, stopNarration])

  useEffect(() => () => {
    stopNarration()
  }, [stopNarration])

  // Demo GPS walks at a steady pace through the generated nearby coordinates.
  // Live modes never use these synthetic positions.
  useEffect(() => {
    if (arViewActive || arrivedAtZone) return
    const target = demoZones[currentZoneIndex]
    const interval = window.setInterval(() => {
      setUserPos((previous) => {
        const remainingMeters = calculateDistanceMeters(previous, target)
        if (remainingMeters <= 1) return previous
        const progress = Math.min(1, 6 / remainingMeters)
        return {
          lat: previous.lat + (target.lat - previous.lat) * progress,
          lng: previous.lng + (target.lng - previous.lng) * progress,
        }
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [arViewActive, arrivedAtZone, currentZoneIndex, demoZones])

  // Reset distance when zone changes + auto-speak direction hint
  useEffect(() => {
    let cancelled = false
    setArrivedAtZone(false)
    setShowFact(false)
    setCurrentTranslation(null)

    const guideZone = activeZones[currentZoneIndex]
    const prepareGuide = async () => {
      let direction = guideZone.direction_hint

      if (lang !== 'en') {
        setTranslationLoading(true)
        const translated = await getGuideTranslation(exploreMonumentId, guideZone)
        if (cancelled) return
        setCurrentTranslation(translated)
        setTranslationLoading(false)
        if (translated) {
          direction = translated.directionHint
        }
      } else {
        setTranslationLoading(false)
      }

      window.setTimeout(() => {
        if (!cancelled) {
          emitYatrikEvent({
            type: 'route-prompt',
            caption: direction,
            narration: null,
            priority: 20,
            state: 'pointing',
            durationMs: 5500,
          })
          void speakFact(direction, lang)
        }
      }, 900)
    }

    void prepareGuide()
    return () => {
      cancelled = true
      stopNarration()
    }
  }, [
    currentZoneIndex,
    exploreMonumentId,
    getGuideTranslation,
    lang,
    speakFact,
    stopNarration,
  ])

  // ── HANDLE ARRIVAL ──────────────────────────────────────
  const handleArrival = useCallback(async () => {
    if (arrivedAtZone) return
    setArrivedAtZone(true)
    setShowFact(true)

    const z = activeZones[currentZoneIndex]

    // Write XP to Supabase
    if (user) {
      try {
        const newXP = await addXP(user.id, z.xp, 'ZONE_EXPLORE')
        setProfile((prev: any) => ({ ...prev, total_xp: newXP }))
        await computeAndSaveBadges(user.id, { total_xp: newXP })
        window.dispatchEvent(new Event('xp-updated'))
      } catch (err) { console.warn('XP award failed:', err) }
    }
    setXpEarned(z.xp)
    setCompletedZones(prev => [...prev, z.id])

    let story = z.arrival_fact
    if (lang !== 'en') {
      const translated =
        currentTranslation || await getGuideTranslation(exploreMonumentId, z)
      if (translated) {
        setCurrentTranslation(translated)
        story = translated.arrivalFact
      }
    }
    emitYatrikEvent({
      type: 'arrival-story',
      caption: story,
      narration: null,
      priority: 70,
      state: 'talking',
      durationMs: 9000,
    })
    emitYatrikEvent({
      type: 'xp-awarded',
      caption: `You earned ${z.xp} XP at ${z.name}!`,
      narration: null,
      priority: 40,
      state: 'celebrating',
      durationMs: 4200,
    })
    void speakFact(story, lang)
  }, [
    arrivedAtZone,
    currentTranslation,
    currentZoneIndex,
    exploreMonumentId,
    getGuideTranslation,
    lang,
    setProfile,
    speakFact,
    user,
  ])

  // ── EXPLORE VIEW MODES ──────────────────────────────────
  const changeViewMode = useCallback((nextMode: ExploreViewMode) => {
    setViewMode(nextMode)
    const nextIsLive = nextMode === 'live-camera' || nextMode === 'live-map'
    if (nextIsLive !== arViewActive) {
      setArrivedAtZone(false)
      setShowFact(false)
    }
    if (nextIsLive) {
      if (!arViewActive) {
        setArViewActive(true)
        void arNav.requestPermissions()
      }
      return
    }

    if (arViewActive) arNav.stop()
    setArViewActive(false)
    if (nextMode === 'demo-camera') {
      void arNav.requestCameraPreview()
    } else {
      arNav.stopCameraPreview()
    }
  }, [arNav, arViewActive])

  // ── COMPLETION SCREEN ───────────────────────────────────
  if (explorerComplete) {
    const totalXP = activeZones.reduce((sum, z) => sum + z.xp, 0)
    return (
      <AppShell>
        <style>{`@keyframes confetti { 0% { transform: translateY(-20px) scale(0.8); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }`}</style>
        <div style={{ textAlign: 'center', padding: '40px 20px', animation: 'confetti 0.6s ease' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏛️</div>
          <h1 style={{ color: '#C9A84C', fontFamily: 'Georgia,serif', fontSize: '32px', marginBottom: '8px' }}>
            Explorer Complete!
          </h1>
          <p style={{ color: '#F5E6D3', fontSize: '16px', marginBottom: '24px' }}>
            You have explored all {activeZones.length} historic zones of the {MONUMENT_NAMES[exploreMonumentId] || 'Monument'}
          </p>
          <div style={{ fontSize: '48px', fontWeight: '700', color: '#C9A84C', marginBottom: '8px' }}>
            +{totalXP} XP
          </div>
          <p style={{ color: '#C4A882', marginBottom: '32px' }}>Total XP earned this exploration</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '32px' }}>
            {activeZones.map(z => (
              <div key={z.id} style={{
                background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)',
                borderRadius: '20px', padding: '8px 16px', color: '#C9A84C', fontSize: '14px'
              }}>
                ✅ {z.emoji} {z.name}
              </div>
            ))}
          </div>
          <button onClick={() => router.push('/')} style={{
            background: 'linear-gradient(135deg,#C9A84C,#D4893F)', borderRadius: '16px',
            padding: '14px 32px', color: '#0F0B1E', fontWeight: '700', fontSize: '16px',
            border: 'none', cursor: 'pointer'
          }}>
            🏠 Back to Home
          </button>
        </div>
      </AppShell>
    )
  }

  // No blocking gate — always go directly into explore
  if (!hasMounted) {
    return (
      <AppShell>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
          <p style={{ color: '#C4A882', fontSize: '13px' }}>Loading explorer...</p>
        </div>
      </AppShell>
    )
  }

  const directionText =
    lang !== 'en' && currentTranslation
      ? currentTranslation.directionHint
      : zone.direction_hint
  const arrivalText =
    lang !== 'en' && currentTranslation
      ? currentTranslation.arrivalFact
      : zone.arrival_fact
  const miniFactText =
    lang !== 'en' && currentTranslation
      ? currentTranslation.miniFact
      : zone.mini_fact

  const liveTracking = arViewActive && arNav.mode === 'live'
  const demoRelativeDirection = arNav.headingDeg !== null
    ? angleDiffDegrees(bearing, arNav.headingDeg)
    : bearing
  const mapUserPosition = viewMode === 'live-map' && arNav.userPosition
    ? arNav.userPosition
    : userPos
  const syntheticDistance = Math.round(calculateDistanceMeters(userPos, zone))
  const insideNow = liveTracking ? arNav.arrivalUnlocked : syntheticDistance <= zone.radius

  const hudFallbackStatus: ExploreFallbackStatus =
    arViewActive && arNav.mode === 'fallback'
      ? arNav.permissions.camera === 'denied' || arNav.permissions.camera === 'unavailable'
        ? 'camera-denied'
        : arNav.permissions.location === 'denied' || arNav.permissions.location === 'unavailable'
          ? 'location-denied'
          : 'orientation-unavailable'
      : 'none'

  const hudMode: ExploreMode =
    !arViewActive
      ? 'demo'
      : arNav.mode === 'fallback'
        ? 'fallback'
        : arNav.mode === 'live'
          ? 'live'
          : 'demo'

  const hudNarrationStatus: ExploreNarrationStatus = isTTSSpeaking
    ? 'speaking'
    : narrationReady
      ? 'ready'
      : translationLoading || narrationLoading
        ? 'loading'
        : 'idle'

  const selectMonument = (id: string) => {
    const name = monumentsList.find(m => m.id === id)?.name || id
    stopNarration()
    setExploreMonumentId(id); saveMonument(id, name)
    setCurrentZoneIndex(0); setCompletedZones([]); setXpEarned(0)
    setExplorerComplete(false); setArrivedAtZone(false); setShowFact(false)
    setUserPos(FIXED_DEMO_START)
  }

  const handleHudArrive = () => {
    void handleArrival()
    if (arViewActive) {
      arNav.stop()
      setArViewActive(false)
      setViewMode('demo-map')
    }
  }

  return (
    <ExploreARHud
      monumentId={exploreMonumentId}
      monuments={monumentsList}
      muted={muted}
      onArrive={handleHudArrive}
      onBack={() => {
        stopNarration()
        router.push('/')
      }}
      onComplete={() => {
        emitYatrikEvent({
          type: 'explore-complete',
          caption: `Amazing! You completed every zone at ${MONUMENT_NAMES[exploreMonumentId] || 'this monument'}.`,
          priority: 90,
          state: 'celebrating',
          durationMs: 8500,
        })
        setExplorerComplete(true)
      }}
      onMonumentChange={selectMonument}
      onNextZone={() => {
        stopNarration()
        setCurrentZoneIndex((current) => current + 1)
      }}
      onPauseNarration={pauseNarration}
      onPlayNarration={() => void playPreparedNarration()}
      onToggleMute={toggleMute}
      onUseMapFallback={() => arNav.retry()}
      onViewModeChange={changeViewMode}
      viewMode={viewMode}
      mapView={(
        <ExploreMap
          zones={displayedZones}
          currentZoneIndex={currentZoneIndex}
          completedZones={completedZones}
          userPos={mapUserPosition}
          monumentId={`${exploreMonumentId}-${arViewActive ? 'live' : 'demo'}`}
        />
      )}
      cameraStream={viewMode === 'demo-camera' || viewMode === 'live-camera' ? arNav.cameraStream : null}
      state={{
        activeZone: {
          name: zone.name,
          emoji: zone.emoji,
          radiusMeters: zone.radius,
          xp: zone.xp,
        },
        arrivalStatus: showFact ? 'arrived' : insideNow ? 'inside' : 'approaching',
        bearingDegrees: liveTracking && arNav.bearingDeg !== null ? arNav.bearingDeg : bearing,
        relativeDirectionDegrees: liveTracking ? arNav.waypoint.relativeAngle : demoRelativeDirection,
        caption: showFact ? arrivalText : directionText,
        distanceMeters: liveTracking && arNav.distanceMeters !== null
          ? Math.round(arNav.distanceMeters)
          : syntheticDistance,
        fallbackStatus: hudFallbackStatus,
        miniFact: showFact ? miniFactText : undefined,
        mode: hudMode,
        narrationStatus: hudNarrationStatus,
        story: showFact ? arrivalText : undefined,
        totalZones: activeZones.length,
        xpEarned: showFact ? xpEarned : undefined,
        zoneIndex: currentZoneIndex,
      }}
    />
  )
}
