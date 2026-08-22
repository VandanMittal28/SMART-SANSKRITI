"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AppShell } from "@/components/app-shell"
import { MapPin, Trophy, ChevronDown, Eye, EyeOff, Crosshair, Lightbulb, Volume2 } from "lucide-react"
import api from "@/lib/apiClient"
import { Toast, useToast } from "@/components/Toast"
import { useLang } from "@/lib/languageContext"
import { getMonument, saveMonument, clearMonument } from "@/lib/monumentStore"
import { useAuth } from "@/lib/authContext"
import { addXP, computeAndSaveBadges } from "@/lib/authClient"
import dynamic from "next/dynamic"

// ─── Haversine distance (meters) ───
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.asin(Math.sqrt(a))
}

function scaleCoordinates(lat: number, lng: number, centerLat: number, centerLng: number, factor = 1.32) {
  return {
    lat: centerLat + (lat - centerLat) * factor,
    lng: centerLng + (lng - centerLng) * factor,
  }
}

// ─── Monument GPS coordinates ───
const MONUMENT_COORDS: Record<string, { lat: number; lng: number; radius: number }> = {
  "taj-mahal":         { lat: 27.1751, lng: 78.0421, radius: 500 },
  "red-fort":          { lat: 28.6562, lng: 77.2410, radius: 400 },
  "qutub-minar":       { lat: 28.5244, lng: 77.1855, radius: 300 },
  "hawa-mahal":        { lat: 26.9239, lng: 75.8267, radius: 300 },
  "india-gate":        { lat: 28.6129, lng: 77.2295, radius: 400 },
  "gateway-india":     { lat: 18.9220, lng: 72.8347, radius: 300 },
  "golden-temple":     { lat: 31.6200, lng: 74.8765, radius: 300 },
  "hampi":             { lat: 15.3350, lng: 76.4600, radius: 600 },
  "kedarnath":         { lat: 30.7352, lng: 79.0669, radius: 400 },
  "meenakshi":         { lat:  9.9195, lng: 78.1193, radius: 300 },
  "mysore-palace":     { lat: 12.3052, lng: 76.6552, radius: 400 },
  "charminar":         { lat: 17.3616, lng: 78.4747, radius: 300 },
  "victoria-memorial": { lat: 22.5448, lng: 88.3426, radius: 400 },
  "ajanta":            { lat: 20.5519, lng: 75.7033, radius: 600 },
  "konark":            { lat: 19.8876, lng: 86.0945, radius: 400 },
}

const MONUMENT_NAMES: Record<string, string> = {
  'taj-mahal': 'Taj Mahal', 'red-fort': 'Red Fort', 'qutub-minar': 'Qutub Minar',
  'gateway-india': 'Gateway of India', 'hampi': 'Hampi', 'golden-temple': 'Golden Temple Amritsar',
  'kedarnath': 'Kedarnath Temple', 'meenakshi': 'Meenakshi Amman Temple', 'mysore-palace': 'Mysore Palace',
  'hawa-mahal': 'Hawa Mahal Jaipur', 'charminar': 'Charminar Hyderabad', 'victoria-memorial': 'Victoria Memorial Kolkata',
  'ajanta': 'Ajanta Caves', 'konark': 'Konark Sun Temple', 'india-gate': 'India Gate Delhi',
}

// ─── Taj Mahal Predefined Riddles ───
const TAJ_MAHAL_RIDDLES = [
  {
    id: 1,
    riddle: "Shah Jahan whispered his grief into these curved walls — stand where sound travels in secrets. Where do whispers travel without being heard by others?",
    location_name: "Whispering Gallery",
    hint: "Look for the curved chambers inside the main mausoleum",
    target_lat: 27.17510, target_lng: 78.04215, radius_meters: 40,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 2,
    riddle: "Four sentinels stand guard at the corners, tilted slightly outward so they never fall upon the tomb. Climb to where the muezzin once called the faithful.",
    location_name: "Northwest Minaret Base",
    hint: "Head to one of the four tall towers at the corners of the plinth",
    target_lat: 27.17498, target_lng: 78.04178, radius_meters: 35,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 3,
    riddle: "Stand at the threshold where the Yamuna meets eternity. The river flows behind the marble throne — find the terrace where emperors once sat to grieve.",
    location_name: "River Terrace",
    hint: "Walk behind the main tomb toward the Yamuna riverbank",
    target_lat: 27.17535, target_lng: 78.04220, radius_meters: 45,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 4,
    riddle: "Two mosques face each other in perfect symmetry — one faces Mecca, the other is just a mirror for balance. Find the one that cannot be used for prayer.",
    location_name: "Jawab (Echo Mosque)",
    hint: "Look to the east side — the mirror building of the mosque",
    target_lat: 27.17461, target_lng: 78.04268, radius_meters: 40,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 5,
    riddle: "The great gate of paradise — stand at the point where the reflecting pool perfectly frames the white dome. This is where every photograph begins.",
    location_name: "Hauz-i-Kausar Reflecting Pool Center",
    hint: "Stand at the midpoint of the long rectangular pool in the garden",
    target_lat: 27.17390, target_lng: 78.04215, radius_meters: 50,
    xp_rewards: { first: 50, second: 30, third: 20 }
  }
]

// ─── Red Fort Predefined Riddles ───
const RED_FORT_RIDDLES = [
  {
    id: 11,
    riddle: "I am the mighty entrance where the flag flies high on Independence Day. My red sandstone towers have watched empires fall and republics rise.",
    location_name: "Lahori Gate",
    hint: "Walk to the main western entrance of the fort",
    target_lat: 28.6558, target_lng: 77.2386, radius_meters: 50,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 12,
    riddle: "Once a covered bazaar where royal ladies shopped for silks and jewels, today I still bustle with merchants under my vaulted roof.",
    location_name: "Chatta Chowk",
    hint: "The covered bazaar immediately after entering Lahori Gate",
    target_lat: 28.6559, target_lng: 77.2393, radius_meters: 60,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 13,
    riddle: "Here musicians once played the naubat (kettledrum) five times a day. Only princes of royal blood could ride their elephants past my gates.",
    location_name: "Naubat Khana",
    hint: "The Drum House located east of Chatta Chowk",
    target_lat: 28.6560, target_lng: 77.2405, radius_meters: 50,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 14,
    riddle: "I am the Hall of Public Audience. Emperor Shah Jahan sat on my marble canopy, listening to the pleas of commoners.",
    location_name: "Diwan-i-Am",
    hint: "The large pillared hall just past the Naubat Khana",
    target_lat: 28.6561, target_lng: 77.2415, radius_meters: 60,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 15,
    riddle: "If there is paradise on earth, it is here. I once housed the legendary Peacock Throne before it was stolen away.",
    location_name: "Diwan-i-Khas",
    hint: "The marble Hall of Private Audience closer to the riverbed",
    target_lat: 28.6565, target_lng: 77.2428, radius_meters: 50,
    xp_rewards: { first: 50, second: 30, third: 20 }
  }
]

// ─── Qutub Minar Predefined Riddles ───
const QUTUB_MINAR_RIDDLES = [
  {
    id: 21,
    riddle: "I am the tallest brick minaret in the world, soaring over 72 meters into the sky. I was built as a victory tower centuries ago.",
    location_name: "Qutub Minar Base",
    hint: "Walk to the base of the massive victory tower",
    target_lat: 28.5244, target_lng: 77.1855, radius_meters: 60,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 22,
    riddle: "I have stood here for over 1,600 years without rusting. Local legend says if you can wrap your arms around me backward, your wish comes true.",
    location_name: "The Iron Pillar",
    hint: "Find the ancient metallic pillar standing in the courtyard",
    target_lat: 28.5247, target_lng: 77.1849, radius_meters: 40,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 23,
    riddle: "I am the magnificent southern gateway, added by Alauddin Khalji. My red sandstone and white marble arches are considered masterpieces of Islamic art.",
    location_name: "Alai Darwaza",
    hint: "The impressive domed gateway on the south side",
    target_lat: 28.5242, target_lng: 77.1852, radius_meters: 40,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 24,
    riddle: "I was meant to be twice as high as my famous neighbor, but the ambitious sultan who started me died, leaving me as an unfinished dream of stone.",
    location_name: "Alai Minar",
    hint: "The large, unfinished rubble tower to the north",
    target_lat: 28.5256, target_lng: 77.1843, radius_meters: 60,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 25,
    riddle: "I am the final resting place of Delhi's second sultan. Look up inside me, and instead of a dome, you'll see the open sky above my intricately carved walls.",
    location_name: "Tomb of Iltutmish",
    hint: "The square tomb structure located to the northwest of the mosque",
    target_lat: 28.5251, target_lng: 77.1844, radius_meters: 40,
    xp_rewards: { first: 50, second: 30, third: 20 }
  }
]

const MONUMENT_RIDDLES: Record<string, typeof TAJ_MAHAL_RIDDLES> = {
  'taj-mahal': TAJ_MAHAL_RIDDLES,
  'red-fort': RED_FORT_RIDDLES,
  'qutub-minar': QUTUB_MINAR_RIDDLES,
}

// ─── Per-monument synthetic player data with real GPS positions ───
const MONUMENT_PLAYERS: Record<string, {
  id: string; name: string; color: string; avatar: string;
  positions: { lat: number; lng: number }[]; clueInterval: number
}[]> = {
  'taj-mahal': [
    { id: 'p0', name: 'Priya', color: '#FF6B9D', avatar: '👩', clueInterval: 45000,
      positions: [{ lat: 27.17455, lng: 78.04190 }, { lat: 27.17498, lng: 78.04178 }, { lat: 27.17535, lng: 78.04220 }] },
    { id: 'p1', name: 'Arjun', color: '#4ECDC4', avatar: '👨', clueInterval: 75000,
      positions: [{ lat: 27.17520, lng: 78.04240 }, { lat: 27.17461, lng: 78.04268 }, { lat: 27.17390, lng: 78.04215 }] },
    { id: 'p2', name: 'Diya',  color: '#FFE66D', avatar: '👧', clueInterval: 60000,
      positions: [{ lat: 27.17440, lng: 78.04260 }, { lat: 27.17510, lng: 78.04215 }, { lat: 27.17462, lng: 78.04178 }] },
  ],
  'red-fort': [
    { id: 'p0', name: 'Priya', color: '#FF6B9D', avatar: '👩', clueInterval: 45000,
      positions: [{ lat: 28.6558, lng: 77.2386 }, { lat: 28.6559, lng: 77.2393 }, { lat: 28.6560, lng: 77.2405 }] },
    { id: 'p1', name: 'Arjun', color: '#4ECDC4', avatar: '👨', clueInterval: 75000,
      positions: [{ lat: 28.6561, lng: 77.2415 }, { lat: 28.6565, lng: 77.2428 }, { lat: 28.6558, lng: 77.2386 }] },
    { id: 'p2', name: 'Diya',  color: '#FFE66D', avatar: '👧', clueInterval: 60000,
      positions: [{ lat: 28.6560, lng: 77.2400 }, { lat: 28.6562, lng: 77.2410 }, { lat: 28.6563, lng: 77.2420 }] },
  ],
  'qutub-minar': [
    { id: 'p0', name: 'Priya', color: '#FF6B9D', avatar: '👩', clueInterval: 45000,
      positions: [{ lat: 28.5244, lng: 77.1855 }, { lat: 28.5247, lng: 77.1849 }, { lat: 28.5242, lng: 77.1852 }] },
    { id: 'p1', name: 'Arjun', color: '#4ECDC4', avatar: '👨', clueInterval: 75000,
      positions: [{ lat: 28.5256, lng: 77.1843 }, { lat: 28.5251, lng: 77.1844 }, { lat: 28.5244, lng: 77.1855 }] },
    { id: 'p2', name: 'Diya',  color: '#FFE66D', avatar: '👧', clueInterval: 60000,
      positions: [{ lat: 28.5248, lng: 77.1850 }, { lat: 28.5245, lng: 77.1855 }, { lat: 28.5243, lng: 77.1848 }] },
  ],
}

// Generate PlayerState[] from MONUMENT_PLAYERS
function makePlayers(monumentId: string): PlayerState[] {
  const players = MONUMENT_PLAYERS[monumentId] || MONUMENT_PLAYERS['taj-mahal']
  return players.map(p => ({
    id: p.id, name: p.name, color: p.color, avatar: p.avatar,
    lat: p.positions[0].lat, lng: p.positions[0].lng,
    prevLat: p.positions[0].lat, prevLng: p.positions[0].lng,
    cluesCompleted: 0, xp: 0, posIndex: 0,
  }))
}

// Per-monument starting GPS for the user (demo mode)
const MONUMENT_USER_START: Record<string, { lat: number; lng: number }> = {
  'taj-mahal':   { lat: 27.17300, lng: 78.04215 },
  'red-fort':    { lat: 28.6545, lng: 77.2375 },
  'qutub-minar': { lat: 28.5235, lng: 77.1845 },
}

type GeoStatus = 'idle' | 'checking' | 'inside' | 'outside' | 'error'

interface PlayerState {
  id: string; name: string; color: string; avatar: string;
  lat: number; lng: number; prevLat: number; prevLng: number;
  cluesCompleted: number; xp: number; posIndex: number;
}

// ─── Leaflet Map Component (dynamically imported, no SSR) ───
const HuntMap = dynamic(() => Promise.resolve(function HuntMapInner({
  riddles, activeClueIdx, completedClues, userLat, userLng,
  players, demoMode, monumentId,
}: {
  riddles: typeof TAJ_MAHAL_RIDDLES; activeClueIdx: number;
  completedClues: Set<number>; userLat: number; userLng: number;
  players: PlayerState[]; demoMode: boolean; monumentId: string;
}) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.Layer[]>([])
  const lastMonumentRef = useRef<string>('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Inject Leaflet CSS via CDN link (Turbopack doesn't support CSS require in components)
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    const L = require('leaflet')

    if (!containerRef.current) return
    
    // If monument changed, destroy and recreate the map
    if (mapRef.current && lastMonumentRef.current !== monumentId) {
      mapRef.current.remove()
      mapRef.current = null
    }
    lastMonumentRef.current = monumentId
    
    // Compute map center from first riddle
    const centerLat = riddles[0]?.target_lat ?? 27.17490
    const centerLng = riddles[0]?.target_lng ?? 78.04215

    if (mapRef.current) {
      // Update existing map
      markersRef.current.forEach(m => mapRef.current!.removeLayer(m))
      markersRef.current = []
    } else {
      mapRef.current = L.map(containerRef.current, {
        center: [centerLat, centerLng],
        zoom: 16.5,
        zoomControl: false,
        attributionControl: false,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapRef.current)
      L.control.zoom({ position: 'topright' }).addTo(mapRef.current)
      // Force Leaflet to recalculate its size after mounting
      setTimeout(() => { mapRef.current?.invalidateSize() }, 200)
    }
    // Pan to new center when active clue changes
    const toScaled = (lat: number, lng: number) => scaleCoordinates(lat, lng, centerLat, centerLng)
    const scaledActive = toScaled(
      riddles[activeClueIdx]?.target_lat ?? centerLat,
      riddles[activeClueIdx]?.target_lng ?? centerLng,
    )

    mapRef.current?.flyTo(
      [scaledActive.lat, scaledActive.lng],
      17,
      { duration: 0.65 }
    )

    const map = mapRef.current!
    const newMarkers: L.Layer[] = []

    const routePoints = riddles.map(r => {
      const scaled = toScaled(r.target_lat, r.target_lng)
      return [scaled.lat, scaled.lng]
    })
    const routeLine = L.polyline(routePoints as [number, number][], {
      color: '#C9A84C',
      weight: 3,
      dashArray: '8 10',
      opacity: 0.7,
    }).addTo(map)
    newMarkers.push(routeLine)

    // Riddle target markers
    riddles.forEach((r, idx) => {
      const isActive = idx === activeClueIdx
      const isCompleted = completedClues.has(r.id)
      const isFuture = idx > activeClueIdx && !isCompleted

      let markerColor = '#555'
      let markerRadius = 9
      let markerOpacity = 0.5
      let fillColor = '#555'

      if (isActive) {
        markerColor = '#C9A84C'
        fillColor = '#C9A84C'
        markerRadius = 14
        markerOpacity = 0.9
      } else if (isCompleted) {
        markerColor = '#4B9B8E'
        fillColor = '#4B9B8E'
        markerRadius = 11
        markerOpacity = 0.8
      } else if (isFuture) {
        markerColor = '#666'
        fillColor = '#444'
        markerRadius = 8
        markerOpacity = 0.4
      }

      const scaled = toScaled(r.target_lat, r.target_lng)

      const cm = L.circleMarker([scaled.lat, scaled.lng], {
        radius: markerRadius,
        fillColor, color: markerColor,
        fillOpacity: markerOpacity, weight: 2, opacity: 1,
      }).addTo(map)

      const label = isCompleted ? `✓ ${r.location_name}` : isFuture ? `🔒 Clue ${idx + 1}` : `📍 ${r.location_name}`
      cm.bindPopup(`<div style="font-size:12px;color:#333;font-weight:600">${label}</div>`)

      // Active clue pulsing ring
      if (isActive) {
        const pulse = L.circleMarker([scaled.lat, scaled.lng], {
          radius: 24, fillColor: '#C9A84C', color: '#C9A84C',
          fillOpacity: 0.15, weight: 1, opacity: 0.4,
        }).addTo(map)
        newMarkers.push(pulse)
      }

      newMarkers.push(cm)
    })

    // User marker
    const scaledUser = toScaled(userLat, userLng)
    const userMarker = L.circleMarker([userLat, userLng], {
      radius: 10, fillColor: '#FFFFFF', color: '#C9A84C',
      fillOpacity: 1, weight: 3, opacity: 1,
    }).addTo(map)
    userMarker.bindPopup('<div style="font-size:12px;font-weight:700;color:#C9A84C">📍 You</div>')
    userMarker.setLatLng([scaledUser.lat, scaledUser.lng])
    newMarkers.push(userMarker)

    // Synthetic player markers
    if (demoMode) {
      players.forEach(p => {
        const scaledPrev = toScaled(p.prevLat, p.prevLng)
        const scaledCurrent = toScaled(p.lat, p.lng)
        // Trail dot (previous position)
        const trail = L.circleMarker([scaledPrev.lat, scaledPrev.lng], {
          radius: 3, fillColor: p.color, color: p.color,
          fillOpacity: 0.3, weight: 0, opacity: 0.3,
        }).addTo(map)
        newMarkers.push(trail)

        // Current position
        const pm = L.circleMarker([scaledCurrent.lat, scaledCurrent.lng], {
          radius: 9, fillColor: p.color, color: '#fff',
          fillOpacity: 0.9, weight: 2, opacity: 1,
        }).addTo(map)
        pm.bindPopup(`<div style="font-size:12px;font-weight:600">${p.avatar} ${p.name} — Clue ${Math.min(p.cluesCompleted + 1, 5)}</div>`)
        newMarkers.push(pm)
      })
    }

    markersRef.current = newMarkers

    return () => {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClueIdx, completedClues.size, userLat, userLng, players, demoMode, monumentId])

  // Invalidate size when active clue changes (panel may have re-rendered)
  useEffect(() => {
    setTimeout(() => { mapRef.current?.invalidateSize() }, 300)
  }, [activeClueIdx])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '68vh', minHeight: '520px', borderRadius: 16, overflow: 'hidden' }} />
}), { ssr: false, loading: () => <div style={{ width: '100%', height: '68vh', minHeight: '520px', background: 'rgba(28,22,56,0.9)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C4A882', fontSize: 13 }}>Loading map...</div> })

// ─── Loading Spinner ───
function LoadingSpinner({ text }: { text?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', gap: 12 }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(201,168,76,0.2)',
        borderTop: '3px solid #C9A84C',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      {text && <p style={{ color: '#C4A882', fontSize: 14, margin: 0 }}>{text}</p>}
    </div>
  )
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function HuntPage() {
  const lastMonument = getMonument()
  const { user, profile, setProfile } = useAuth()
  const { toast, showToast, hideToast } = useToast()
  const { t } = useLang()

  // ─── Selection state ───
  const monumentSelected = true // always start directly into hunt (no blocking gate)
  const [huntMonumentId, setHuntMonumentId] = useState(
    (() => {
      const stored = lastMonument?.id
      return stored && MONUMENT_RIDDLES[stored] ? stored : 'taj-mahal'
    })()
  )
  const [monuments, setMonuments] = useState<{id: string, name: string}[]>([])

  // ─── Geo state ───
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [demoMode, setDemoMode] = useState(true) // ON by default
  const [userDistance, setUserDistance] = useState<number | null>(null)

  // ─── Riddle state ───
  const [activeClueIdx, setActiveClueIdx] = useState(0)
  const [completedClues, setCompletedClues] = useState<Set<number>>(new Set())
  const [showHint, setShowHint] = useState(false)
  const [checkingGeo, setCheckingGeo] = useState(false)
  const [locationVerified, setLocationVerified] = useState(false)
  const [huntCompleted, setHuntCompleted] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [huntStarted, setHuntStarted] = useState(false)

  // ─── Clue completion tracking (for XP tiers) ───
  const [clueCompletions, setClueCompletions] = useState<Record<number, string[]>>({})

  // ─── User GPS ───
  const [userLat, setUserLat] = useState(() => (MONUMENT_USER_START[lastMonument?.id || 'taj-mahal'] || MONUMENT_USER_START['taj-mahal']).lat)
  const [userLng, setUserLng] = useState(() => (MONUMENT_USER_START[lastMonument?.id || 'taj-mahal'] || MONUMENT_USER_START['taj-mahal']).lng)

  // ─── Synthetic players ───
  const [playerStates, setPlayerStates] = useState<PlayerState[]>(() => makePlayers(lastMonument?.id || 'taj-mahal'))

  // ─── Leaderboard ───
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  // ─── Celebration ───
  const [celebrateXp, setCelebrateXp] = useState<number | null>(null)
  const [celebrateMedal, setCelebrateMedal] = useState('')

  // ─── Guard ref: prevents double-firing of onClueVerified ───
  const isAdvancingRef = useRef(false)

  const monumentName = MONUMENT_NAMES[huntMonumentId] || huntMonumentId
  const activeRiddles = MONUMENT_RIDDLES[huntMonumentId] || TAJ_MAHAL_RIDDLES
  const activeRiddle = activeRiddles[activeClueIdx]

  const speakCurrentClue = useCallback(() => {
    if (!activeRiddle || typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(activeRiddle.riddle)
    utterance.lang = 'en-US'
    utterance.rate = 0.92
    window.speechSynthesis.speak(utterance)
  }, [activeRiddle])

  const recenterOnActiveClue = useCallback(() => {
    if (!activeRiddle) return
    setUserLat(activeRiddle.target_lat - 0.00008)
    setUserLng(activeRiddle.target_lng - 0.00008)
  }, [activeRiddle])

  // ─── Monument list — only the 3 demo-ready ones ───
  useEffect(() => {
    setMonuments([
      { id: 'taj-mahal',   name: 'Taj Mahal' },
      { id: 'red-fort',    name: 'Red Fort' },
      { id: 'qutub-minar', name: 'Qutub Minar' },
    ])
    // Save default on first load so localStorage is set
    if (!lastMonument) saveMonument('taj-mahal', 'Taj Mahal')
  }, [])

  // ─── Geo-fence entry check ───
  const checkMonumentGeo = useCallback((monumentId: string) => {
    const coords = MONUMENT_COORDS[monumentId]
    if (!coords) { setGeoStatus('inside'); return }
    setGeoStatus('checking')
    if (!navigator.geolocation) { setGeoStatus('error'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = getDistanceMeters(pos.coords.latitude, pos.coords.longitude, coords.lat, coords.lng)
        setUserDistance(Math.round(dist))
        setGeoStatus(dist <= coords.radius ? 'inside' : 'outside')
      },
      () => setGeoStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // Trigger geo-check on monument selection
  useEffect(() => {
    if (monumentSelected && !demoMode) checkMonumentGeo(huntMonumentId)
    if (monumentSelected && demoMode) setGeoStatus('inside')
  }, [monumentSelected, huntMonumentId, demoMode, checkMonumentGeo])

  // Auto-start hunt when geo is inside or demo
  useEffect(() => {
    if (monumentSelected && (geoStatus === 'inside' || demoMode) && activeRiddles) {
      setHuntStarted(true)
    }
  }, [monumentSelected, geoStatus, demoMode, huntMonumentId, activeRiddles])

  // NOTE: No locationVerified useEffect needed.
  // Advance is driven directly from onClueVerified via sequential timers.

  // ─── GPS tracking ───
  useEffect(() => {
    if (!huntStarted || demoMode) return
    const watchId = navigator.geolocation?.watchPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude) },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
    return () => { if (watchId !== undefined) navigator.geolocation?.clearWatch(watchId) }
  }, [huntStarted, demoMode])

  // ─── Synthetic player position cycling (every 4s) ───
  useEffect(() => {
    if (!huntStarted || !demoMode) return
    const interval = setInterval(() => {
      const players = MONUMENT_PLAYERS[huntMonumentId] || MONUMENT_PLAYERS['taj-mahal']
      setPlayerStates(prev => prev.map(p => {
        const sp = players.find(s => s.id === p.id)
        if (!sp) return p
        const nextIdx = (p.posIndex + 1) % sp.positions.length
        return {
          ...p,
          prevLat: p.lat, prevLng: p.lng,
          lat: sp.positions[nextIdx].lat,
          lng: sp.positions[nextIdx].lng,
          posIndex: nextIdx,
        }
      }))
    }, 4000)
    return () => clearInterval(interval)
  }, [huntStarted, demoMode, huntMonumentId])

  // ─── Synthetic player clue completion (auto-advance) ───
  useEffect(() => {
    if (!huntStarted || !demoMode) return
    const players = MONUMENT_PLAYERS[huntMonumentId] || MONUMENT_PLAYERS['taj-mahal']
    const timers = players.map((sp) => {
      return setInterval(() => {
        setPlayerStates(prev => prev.map(p => {
          if (p.id !== sp.id || p.cluesCompleted >= 5) return p
          const newCompleted = p.cluesCompleted + 1
          const clueId = activeRiddles[p.cluesCompleted]?.id
          if (clueId) {
            setClueCompletions(cc => {
              const arr = cc[clueId] || []
              if (!arr.includes(p.id)) return { ...cc, [clueId]: [...arr, p.id] }
              return cc
            })
          }
          // Determine XP for position
          const completersCount = (clueCompletions[clueId] || []).length
          let xpGain = 10
          if (completersCount === 0) xpGain = 50
          else if (completersCount === 1) xpGain = 30
          else if (completersCount === 2) xpGain = 20
          return { ...p, cluesCompleted: newCompleted, xp: p.xp + xpGain }
        }))
      }, sp.clueInterval)
    })
    return () => timers.forEach(clearInterval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huntStarted, demoMode, huntMonumentId])

  // ─── Verify current clue location ───
  const verifyClueLocation = () => {
    if (!activeRiddle) return
    if (isAdvancingRef.current) return // guard: already advancing

    // Demo mode: skip GPS distance check but still require manual button click
    if (demoMode) {
      onClueVerified()
      return
    }

    setCheckingGeo(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = getDistanceMeters(pos.coords.latitude, pos.coords.longitude, activeRiddle.target_lat, activeRiddle.target_lng)
        if (dist <= activeRiddle.radius_meters) {
          onClueVerified()
        } else {
          showToast(`📍 Walk ~${Math.round(dist)}m closer`)
          setCheckingGeo(false)
        }
      },
      () => { onClueVerified(); setCheckingGeo(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // ─── On Clue Verified — single entry point, drives entire advance sequence ───
  // NOTE: NOT async — the setTimeout(1500) must always fire unconditionally.
  // XP is fire-and-forget (.then/.catch) so a slow/hung network never blocks advancement.
  const onClueVerified = () => {
    if (!activeRiddle) return
    if (isAdvancingRef.current) return
    isAdvancingRef.current = true

    // Show verified message
    setLocationVerified(true)

    const clueId = activeRiddle.id
    const xpAmount = 50

    // Mark clue completed immediately
    setCompletedClues(prev => new Set([...prev, clueId]))
    setXpEarned(prev => prev + xpAmount)

    // Award XP — fire-and-forget, NEVER block the advance timer
    if (user?.id) {
      addXP(user.id, xpAmount, 'HUNT_STEP_DONE')
        .then(newXP => {
          setProfile((prev: any) => prev ? { ...prev, total_xp: newXP } : prev)
          computeAndSaveBadges(user.id, { total_xp: newXP }).then(() => {
            window.dispatchEvent(new Event('xp-updated'))
          }).catch(() => {})
        })
        .catch(e => console.error('XP award failed:', e))
    }

    // Show toast immediately
    showToast('🥇 First to find it! +' + xpAmount + ' XP')

    // Always advance after 1.5s — regardless of XP network outcome
    setTimeout(() => {
      setLocationVerified(false)
      setCheckingGeo(false)
      setShowHint(false)

      // Functional updater avoids stale closure on activeClueIdx
      setActiveClueIdx(prev => {
        const next = prev + 1

        if (next < activeRiddles.length) {
          // More clues remaining
          setTimeout(() => {
            isAdvancingRef.current = false
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }, 200)
          return next
        } else {
          // All clues done — hunt complete
          setTimeout(() => {
            setHuntCompleted(true)
            isAdvancingRef.current = false
            // Bonus XP for completion — fire-and-forget
            if (user?.id) {
              addXP(user.id, 500, 'HUNT_COMPLETED')
                .then(newXP => {
                  setProfile((p: any) => p ? { ...p, total_xp: newXP } : p)
                  window.dispatchEvent(new Event('xp-updated'))
                })
                .catch(() => {})
            }
          }, 200)
          return prev
        }
      })
    }, 1500)
  }

  const activateDemo = () => { setDemoMode(true); setGeoStatus('inside') }

  // ─── Build leaderboard ───
  const leaderboard = [
    ...playerStates.map(p => ({
      name: p.name, avatar: p.avatar, clues: p.cluesCompleted,
      xp: p.xp, isUser: false, color: p.color,
    })),
    {
      name: profile?.full_name?.split(' ')[0] || 'You',
      avatar: '🧑', clues: completedClues.size, xp: xpEarned,
      isUser: true, color: '#C9A84C',
    }
  ].sort((a, b) => b.xp - a.xp || b.clues - a.clues)

  // ═══════════════
  // RENDER: Monument Selection
  // ═══════════════
  // No blocking gate — always go directly into hunt/demo
  // ═══════════════
  // RENDER: Geo-checking
  // ═══════════════
  if (geoStatus === 'checking') {
    return <AppShell><div className="p-4 lg:p-8"><h1 className="font-serif text-3xl lg:text-4xl font-bold text-[#C9A84C] mb-2">{t('treasure_hunt')}</h1><LoadingSpinner text="📍 Checking your location..." /></div></AppShell>
  }

  // ═══════════════
  // RENDER: Outside geo-fence
  // ═══════════════
  if (geoStatus === 'outside' && !demoMode) {
    return (
      <AppShell>
        <div className="p-4 lg:p-8">
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-[#C9A84C] mb-2">{t('treasure_hunt')}</h1>
          <div style={{ background: 'rgba(28,22,56,0.9)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 20, padding: 40, maxWidth: 520, margin: '2rem auto', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
            <h2 style={{ color: '#C9A84C', fontFamily: 'Georgia,serif', fontSize: 22, margin: '0 0 12px' }}>Location Required</h2>
            <p style={{ color: '#C4A882', fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
              You must be physically present at <strong style={{ color: '#E8C97A' }}>{monumentName}</strong> to join this hunt.
            </p>
            {userDistance !== null && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(212,137,63,0.12)', border: '1px solid rgba(212,137,63,0.3)', borderRadius: 10, color: '#D4893F', fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
                📍 You are ~{userDistance >= 1000 ? `${(userDistance / 1000).toFixed(1)}km` : `${userDistance}m`} away
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <button onClick={() => checkMonumentGeo(huntMonumentId)} style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🔄 Re-check Location</button>
              <button onClick={activateDemo} style={{ padding: '12px 24px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(212,137,63,0.2))', border: '1px solid rgba(201,168,76,0.5)', color: '#E8C97A', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🎮 Demo Mode</button>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  // GPS error
  if (geoStatus === 'error' && !demoMode) {
    return (
      <AppShell>
        <div className="p-4 lg:p-8">
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-[#C9A84C] mb-2">{t('treasure_hunt')}</h1>
          <div style={{ background: 'rgba(28,22,56,0.9)', border: '1px solid rgba(196,91,58,0.4)', borderRadius: 20, padding: 40, maxWidth: 520, margin: '2rem auto', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📍</div>
            <h2 style={{ color: '#E8A85C', fontFamily: 'Georgia,serif', fontSize: 20, margin: '0 0 12px' }}>Location Access Required</h2>
            <p style={{ color: '#C4A882', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>Please enable GPS / location services.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => checkMonumentGeo(huntMonumentId)} style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🔄 Try Again</button>
              <button onClick={activateDemo} style={{ padding: '12px 24px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(212,137,63,0.2))', border: '1px solid rgba(201,168,76,0.5)', color: '#E8C97A', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🎮 Demo Mode</button>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  // ═══════════════
  // RENDER: Hunt Completed
  // ═══════════════
  if (huntCompleted) {
    return (
      <AppShell>
        <div className="p-4 lg:p-8 animate-fade-in">
          {demoMode && (
            <div style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(212,137,63,0.15))', border: '1px solid rgba(201,168,76,0.5)', borderRadius: 10, padding: '8px 16px', marginBottom: 16, textAlign: 'center', color: '#E8C97A', fontSize: 13, fontWeight: 700 }}>
              🎮 DEMO MODE — Geo-fence bypassed | Synthetic players active
            </div>
          )}
          <div className="glass-card rounded-xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="font-serif text-2xl font-bold text-[#C9A84C] mb-2">{t('heritage_hunter')}</h2>
            <p className="text-[#C4A882] mb-4">You completed the Taj Mahal Treasure Hunt!</p>
            <div className="inline-block px-4 py-2 bg-[#534AB7]/20 rounded-full mb-6 animate-xp-pulse">
              <span className="text-[#534AB7] font-bold">⚡ +500 XP Bonus + {xpEarned} XP Total</span>
            </div>
            <div className="glass-card rounded-lg p-4 inline-block mb-6">
              <Trophy className="w-12 h-12 text-[#C9A84C] mx-auto mb-2" />
              <p className="text-[#C9A84C] font-semibold">Heritage Hunter Badge Unlocked</p>
            </div>
            {/* Final leaderboard */}
            <div style={{ background: 'rgba(28,22,56,0.9)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 14, padding: 16, marginTop: 16, maxWidth: 400, margin: '16px auto', textAlign: 'left' }}>
              <h3 style={{ color: '#C9A84C', fontFamily: 'Georgia,serif', fontSize: 16, marginBottom: 12, textAlign: 'center' }}>🏆 Final Standings</h3>
              {leaderboard.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px',
                  borderRadius: 10, marginBottom: 4,
                  background: p.isUser ? 'rgba(201,168,76,0.12)' : 'transparent',
                  border: p.isUser ? '1px solid rgba(201,168,76,0.4)' : '1px solid transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, width: 24 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
                    <span style={{ color: p.isUser ? '#C9A84C' : '#F5E6D3', fontSize: 14, fontWeight: p.isUser ? 700 : 500 }}>{p.avatar} {p.name}</span>
                  </div>
                  <div style={{ color: '#9B92F0', fontSize: 13, fontWeight: 700 }}>⚡ {p.xp} XP</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <button className="px-6 py-3 border border-[#C9A84C]/50 text-[#C9A84C] font-semibold rounded-xl transition-all duration-300 hover:bg-[#C9A84C]/10">{t('share_achievement')}</button>
              <button className="px-6 py-3 gold-gradient text-[#0F0B1E] font-semibold rounded-xl transition-all duration-300 hover:scale-105">{t('explore_more')}</button>
            </div>
          </div>
        </div>
        {toast && <Toast message={toast} onDone={hideToast} />}
      </AppShell>
    )
  }

  // ═══════════════
  // RENDER: Active Hunt
  // ═══════════════
  return (
    <AppShell>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse-green{0%,100%{box-shadow:0 0 0 0 rgba(75,155,142,0.5)}70%{box-shadow:0 0 0 10px rgba(75,155,142,0)}}
        @keyframes pulse-gold{0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,0.4)}70%{box-shadow:0 0 0 8px rgba(201,168,76,0)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div className="px-4 py-3 animate-fade-in">

        {/* ═══ Side-by-side wrapper ═══ */}
        <div className="flex w-full flex-col gap-4">

          {/* ── LEFT PANEL (60%) — Riddle + Controls ── */}
          <div className="flex w-full flex-col gap-3 order-2">

            {/* Demo Mode ribbon */}
            {demoMode && (
              <div className="bg-gradient-to-br from-[#C9A84C]/20 to-[#D4893F]/15 border border-[#C9A84C]/50 rounded-xl p-3 flex items-center justify-between text-[#E8C97A] text-xs md:text-sm font-bold">
                <span>🎮 DEMO MODE<span className="hidden sm:inline"> — Geo bypassed</span></span>
                <button onClick={() => setDemoMode(false)} className="bg-[#C9A84C]/20 border border-[#C9A84C]/40 rounded-lg px-2 md:px-3 py-1 text-[#C9A84C] text-[10px] md:text-sm font-semibold cursor-pointer min-h-[44px] flex items-center justify-center">Turn Off</button>
              </div>
            )}

            {/* Monument switcher + progress */}
            <div className="flex items-center justify-between">
              <div>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <select
                    value={huntMonumentId}
                    onChange={e => {
                      const id = e.target.value
                      const name = monuments.find(m => m.id === id)?.name || id
                      const start = MONUMENT_USER_START[id] || MONUMENT_USER_START['taj-mahal']
                      setHuntMonumentId(id); saveMonument(id, name)
                      setActiveClueIdx(0); setCompletedClues(new Set()); setXpEarned(0); setHuntCompleted(false)
                      setPlayerStates(makePlayers(id))
                      setUserLat(start.lat); setUserLng(start.lng)
                      setLocationVerified(false); setShowHint(false); setClueCompletions({})
                      isAdvancingRef.current = false // reset guard when monument changes
                    }}
                    style={{
                      fontFamily: 'Georgia,serif', fontSize: '20px', fontWeight: 700,
                      color: '#C9A84C', background: 'transparent', border: 'none',
                      paddingRight: 22, cursor: 'pointer', appearance: 'none' as const,
                      outline: 'none'
                    }}
                  >
                    {monuments.map(m => (
                      <option key={m.id} value={m.id} style={{ background: '#1C1638', color: '#C9A84C' }}>
                        🗺️ {m.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown style={{ position: 'absolute', right: 0, top: 7, width: 13, height: 13, color: '#C9A84C', pointerEvents: 'none' }} />
                </div>
                <p className="text-[#C4A882] text-xs m-0 mt-0.5">{t('treasure_hunt')}</p>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-[#F5E6D3] text-sm md:text-base font-semibold">Clue {activeClueIdx + 1} of {activeRiddles.length}</span>
                <span className="px-2 py-1 rounded-lg border border-[#4B9B8E]/40 bg-[#4B9B8E]/15 text-[#7EE4D4] text-[11px] font-bold">
                  {completedClues.size}/{activeRiddles.length} checkpoints
                </span>
                <span className="px-3 py-1.5 bg-[#C9A84C]/15 rounded-full text-[#C9A84C] text-[11px] md:text-[13px] font-bold">⚡ {xpEarned} XP</span>
              </div>
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 6 }}>
              {activeRiddles.map((r, idx) => (
                <div key={r.id} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: completedClues.has(r.id) ? '#4B9B8E' : idx === activeClueIdx ? '#C9A84C' : 'rgba(201,168,76,0.15)',
                  transition: 'all 0.3s ease'
                }} />
              ))}
            </div>

            {/* Scoreboard toggle */}
            <div className="relative">
              <button 
                onClick={() => setShowLeaderboard(!showLeaderboard)} 
                className="flex items-center gap-2 px-4 rounded-xl bg-[#1C1638]/90 border border-[#C9A84C]/20 text-[#C9A84C] text-xs md:text-sm font-semibold cursor-pointer min-h-[44px]"
              >
                🏆 Scoreboard {showLeaderboard ? '▲' : '▼'}
              </button>

              {showLeaderboard && (
                <>
                  <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setShowLeaderboard(false)} />
                  <div className="fixed md:static bottom-0 left-0 w-full md:w-auto max-h-[50vh] md:max-h-none overflow-y-auto z-50 bg-[#1C1638] md:bg-[#1C1638]/90 border-t md:border border-[#C9A84C]/20 md:rounded-xl rounded-t-2xl p-4 md:p-3 animate-slide-up md:mt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:shadow-none">
                    <div className="flex md:hidden justify-between items-center mb-4">
                      <span className="text-[#C9A84C] font-bold text-lg">🏆 Scoreboard</span>
                      <button onClick={() => setShowLeaderboard(false)} className="text-[#C4A882] text-2xl p-2 min-h-[44px] leading-none">&times;</button>
                    </div>
                    {leaderboard.map((p, i) => (
                      <div key={i} className={`flex items-center justify-between p-2 md:p-2 rounded-lg mb-1 ${p.isUser ? 'bg-[#C9A84C]/10 border border-[#C9A84C]/30' : 'bg-transparent border border-transparent'}`}>
                        <div className="flex items-center gap-2">
                          <span className="w-5 md:w-6 text-center text-sm">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
                          <span className={`${p.isUser ? 'text-[#C9A84C] font-bold' : 'text-[#F5E6D3] font-medium'} text-xs md:text-sm`}>
                            <span className="inline-block md:inline">{p.avatar}</span> {p.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] md:text-xs">
                          <span className="text-[#7A6E5C]">{p.clues} clue{p.clues !== 1 ? 's' : ''} ✓</span>
                          <span className="text-[#C9A84C] font-bold">⚡ {p.xp} XP</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Active Riddle Card */}
            {activeRiddle && !locationVerified && (
              <div className="bg-[#1C1638]/90 backdrop-blur-md border border-[#D4893F]/40 p-4 md:p-6 rounded-2xl bg-gradient-to-br from-[#D4893F]/10 to-transparent">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{
                    display: 'inline-block', padding: '4px 12px',
                    background: 'rgba(201,168,76,0.2)', color: '#C9A84C',
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                    borderRadius: 20, letterSpacing: 1
                  }}>Clue {activeClueIdx + 1}</span>
                  <span style={{ color: '#7A6E5C', fontSize: 12 }}>📍 {activeRiddle.location_name}</span>
                </div>

                {/* Riddle text */}
                <p style={{
                  color: '#F5E6D3', fontSize: 16, lineHeight: 1.6,
                  fontFamily: 'Georgia, serif', marginBottom: 20,
                  fontStyle: 'italic'
                }} className="md:text-lg">
                  &ldquo;{activeRiddle.riddle}&rdquo;
                </p>

                {/* Hint toggle */}
                <button onClick={() => setShowHint(!showHint)} className="flex items-center gap-2 px-3 md:px-4 py-2 min-h-[44px] rounded-lg mb-4 bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] text-xs md:text-sm font-semibold cursor-pointer">
                  {showHint ? <EyeOff size={16} /> : <Eye size={16} />}
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </button>
                {showHint && (
                  <div style={{
                    padding: '12px 16px', marginBottom: 16,
                    background: 'rgba(201,168,76,0.06)',
                    border: '1px solid rgba(201,168,76,0.15)',
                    borderRadius: 10, color: '#E8C97A', fontSize: 13,
                    fontStyle: 'italic'
                  }} className="md:text-sm">
                    💡 {activeRiddle.hint}
                  </div>
                )}

                {/* I Am Here button */}
                <button
                  onClick={verifyClueLocation}
                  disabled={checkingGeo}
                  className={`w-full p-3 md:p-4 min-h-[48px] rounded-xl flex items-center justify-center gap-2 text-white text-sm md:text-base font-bold transition-all duration-300 border-none ${checkingGeo ? 'bg-[#534AB7]/30 cursor-not-allowed' : 'gold-gradient cursor-pointer'}`}
                  style={{ background: checkingGeo ? 'rgba(83,74,183,0.3)' : 'linear-gradient(135deg, #534AB7, #7C3AED)' }}
                >
                  {checkingGeo ? (
                    <>📍 Verifying location...</>
                  ) : (
                    <><MapPin size={18} /> I Am Here</>
                  )}
                </button>
              </div>
            )}

            {/* Location verified transition — shows spinner so panel is never blank */}
            {locationVerified && (
              <div style={{
                textAlign: 'center', padding: '30px 20px',
                background: 'rgba(75,155,142,0.1)',
                border: '1px solid rgba(75,155,142,0.3)',
                borderRadius: 16,
              }}>
                <div style={{ color: '#4B9B8E', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
                  ✓ Location verified!
                </div>
                <div style={{
                  width: 32, height: 32, margin: '0 auto',
                  border: '3px solid rgba(75,155,142,0.2)',
                  borderTop: '3px solid #4B9B8E',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <p style={{ color: '#7ECDC0', fontSize: 13, marginTop: 12 }}>Loading next clue...</p>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL (40%) — Sticky Map ── */}
          <div className="order-1 flex w-full flex-col">

            <div className="mb-2 rounded-2xl border border-[#C9A84C]/25 bg-white/5 px-3 py-2 backdrop-blur-xl">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#C4A882]">
                <span>Clue {activeClueIdx + 1} of {activeRiddles.length}</span>
                <span>{Math.round(((activeClueIdx + 1) / activeRiddles.length) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-black/35">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#D4893F,#C9A84C)] transition-all duration-500" style={{ width: `${Math.round(((activeClueIdx + 1) / activeRiddles.length) * 100)}%` }} />
              </div>
            </div>

            {/* Map container */}
            <div className="rounded-2xl border border-[#C9A84C]/20 bg-white/5 p-2 backdrop-blur-xl">
              <div className="relative z-0 w-full overflow-hidden rounded-2xl border border-[#C9A84C]/20 bg-[#1C1638]/90">
                <HuntMap
                  riddles={activeRiddles}
                  activeClueIdx={activeClueIdx}
                  completedClues={completedClues}
                  userLat={userLat}
                  userLng={userLng}
                  players={playerStates}
                  demoMode={demoMode}
                  monumentId={huntMonumentId}
                />

                <div className="absolute right-3 top-3 z-[1200] flex flex-col gap-2">
                  <button
                    onClick={speakCurrentClue}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C9A84C]/35 bg-[#0F0B1E]/85 text-[#C9A84C]"
                    aria-label="Voice clue"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowHint(prev => !prev)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C9A84C]/35 bg-[#0F0B1E]/85 text-[#C9A84C]"
                    aria-label="Toggle hint"
                  >
                    <Lightbulb className="h-4 w-4" />
                  </button>
                  <button
                    onClick={recenterOnActiveClue}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C9A84C]/35 bg-[#0F0B1E]/85 text-[#C9A84C]"
                    aria-label="Recenter hunt"
                  >
                    <Crosshair className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Player status chips */}
            {demoMode && (
              <div className="flex flex-row overflow-hidden max-w-full gap-2 mt-3 items-center">
                {[
                  { avatar: '🧑', name: profile?.full_name?.split(' ')[0] || 'You', clue: activeClueIdx + 1, color: '#C9A84C', isUser: true },
                  ...playerStates.map(p => ({ avatar: p.avatar, name: p.name, clue: Math.min(p.cluesCompleted + 1, 5), color: p.color, isUser: false }))
                ].map((p, i) => (
                  <div key={i} className={`flex items-center gap-1.5 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 rounded-full whitespace-nowrap flex-shrink-0 min-h-[28px] ${p.isUser ? 'bg-[#C9A84C]/15 border border-[#C9A84C]/40' : 'bg-[#1C1638]/90 border border-white/10'}`}>
                    <div className="w-2 h-2 rounded-full md:hidden flex-shrink-0" style={{ backgroundColor: p.color }}></div>
                    <span className="hidden md:inline">{p.avatar}</span>
                    <span className={`hidden md:inline text-xs font-semibold ${p.isUser ? 'text-[#C9A84C]' : 'text-[#C4A882]'}`}>{p.name}</span>
                    <span className="md:hidden text-[10px] font-bold" style={{ color: p.color }}>C{p.clue}</span>
                    <span className="hidden md:inline text-[10px] text-[#7A6E5C]">— Clue {p.clue}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>{/* end side-by-side wrapper */}

        {/* Celebration overlay (fixed, outside layout) */}
        {celebrateXp !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#0F0B1E]/90 backdrop-blur-sm" />
            <div className="relative glass-card rounded-2xl p-8 max-w-sm w-full text-center animate-slide-up">
              <div className="text-6xl mb-4">📍</div>
              <h2 className="text-2xl font-bold text-[#4B9B8E] mb-2">Location Found!</h2>
              <p style={{ color: '#C4A882', marginBottom: 8, fontSize: 15 }}>{activeRiddle?.location_name}</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#534AB7]/20 rounded-full mb-4 animate-xp-pulse">
                <span className="text-[#534AB7] font-bold">{celebrateMedal} +{celebrateXp} XP</span>
              </div>
              <p style={{ color: '#7A6E5C', fontSize: 13 }}>Next clue loading...</p>
            </div>
          </div>
        )}

      </div>
      {toast && <Toast message={toast} onDone={hideToast} />}
    </AppShell>
  )
}
