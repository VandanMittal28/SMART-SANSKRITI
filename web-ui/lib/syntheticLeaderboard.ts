import { LocalProfile } from './localProfile'

export interface SyntheticLeaderboardEntry {
  name: string
  xp: number
  rank: number
  badge?: string
  isCurrentUser?: boolean
}

const BADGES = ['🏛️', '🗺️', '🎓', '🏆', '👑', '✨']
const MOCK_NAMES = [
  'Aarav',
  'Priya',
  'Arjun',
  'Diya',
  'Kabir',
  'Anika',
  'Rohan',
  'Meera',
  'Ishaan',
  'Kavya',
  'Vivaan',
  'Saanvi',
  'Reyansh',
  'Aanya',
  'Atharv',
  'Myra',
]

function seededScore(seed: number): number {
  const base = ((seed * 9301 + 49297) % 233280) / 233280
  return Math.round(120 + base * 2200)
}

export function buildSyntheticLeaderboard(profile: LocalProfile): SyntheticLeaderboardEntry[] {
  const generated = MOCK_NAMES.slice(0, 15).map((name, index) => ({
    name,
    xp: seededScore((index + 1) * 37),
    badge: BADGES[index % BADGES.length],
    isCurrentUser: false,
  }))

  const currentName = (profile.full_name || 'You').split(' ')[0]
  generated.push({
    name: currentName,
    xp: profile.total_xp,
    badge: '🧑',
    isCurrentUser: true,
  })

  return generated
    .sort((a, b) => b.xp - a.xp)
    .map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }))
}
