const TAJ_MAHAL_RIDDLES = [
  {
    id: 1,
    riddle: "A great white marble dome crowns the tomb built by Shah Jahan in memory of Mumtaz Mahal. Find the main mausoleum from the public visitor area.",
    location_name: "Main Mausoleum",
    hint: "Look for the great white dome. Stay on the permitted visitor path around the mausoleum.",
    target_lat: 27.17510, target_lng: 78.04215, radius_meters: 40,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 2,
    riddle: "Four sentinels stand guard at the corners, tilted slightly outward so they never fall upon the tomb. Find their base from the public visitor path.",
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
    riddle: "I have stood here for over 1,600 years without rusting. Find me from the visitor path, without touching or crossing the protective barrier.",
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

export const MONUMENT_RIDDLES: Record<string, typeof TAJ_MAHAL_RIDDLES> = {
  'taj-mahal': TAJ_MAHAL_RIDDLES,
  'red-fort': RED_FORT_RIDDLES,
  'qutub-minar': QUTUB_MINAR_RIDDLES,
}


export const HUNT_NAMES: Record<string, string> = {
  'taj-mahal': 'Taj Mahal', 'red-fort': 'Red Fort', 'qutub-minar': 'Qutub Minar',
}
export type HuntMode = 'onsite' | 'practice'
export type HuntProgress = { version: 1; completed: number; startedAt: number; reward: 'none' | 'pending' | 'saved' | 'unconfirmed' }
export type HuntPosition = { lat: number; lng: number; accuracy: number; timestamp: number }
export function newProgress(): HuntProgress {
  return { version: 1, completed: 0, startedAt: Date.now(), reward: 'none' }
}
export function readProgress(raw: string | null, count: number): HuntProgress | null {
  try {
    const p = JSON.parse(raw || 'null')
    if (!p || p.version !== 1 || !Number.isInteger(p.completed) || p.completed < 0 || p.completed > count ||
      !Number.isFinite(p.startedAt) || !['none', 'pending', 'saved', 'unconfirmed'].includes(p.reward)) return null
    return p
  } catch { return null }
}
export function progressKey(userId: string | undefined, monument: string, mode: HuntMode) {
  return `sanskriti:hunt:v1:${userId || 'guest'}:${monument}:${mode}`
}
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = Math.PI / 180
  const a = Math.sin((lat2-lat1)*rad/2)**2 + Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin((lng2-lng1)*rad/2)**2
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)))
}
export function checkCheckpoint(position: HuntPosition, clue: { target_lat: number; target_lng: number; radius_meters: number }, now = Date.now()) {
  if (![position.lat, position.lng, position.accuracy, position.timestamp].every(Number.isFinite) ||
      Math.abs(position.lat) > 90 || Math.abs(position.lng) > 180 || position.accuracy < 0 ||
      now - position.timestamp > 30000 || position.timestamp > now + 5000) {
    return { verified: false, message: 'Your location is stale or unavailable. Check again for a fresh GPS reading.' }
  }
  if (position.accuracy > clue.radius_meters) {
    return { verified: false, message: `GPS accuracy is ±${Math.round(position.accuracy)} m. Move to an open visitor area and try again.` }
  }
  const distance = distanceMeters(position.lat, position.lng, clue.target_lat, clue.target_lng)
  return { verified: distance <= clue.radius_meters, message: distance <= clue.radius_meters
    ? 'Checkpoint found!'
    : `You are about ${Math.round(distance)} m from this checkpoint. Get within ${clue.radius_meters} m and check again.` }
}
