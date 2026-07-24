import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const earthRadiusMeters = 6_371_000
  const latitudeDelta = toRad(lat2 - lat1)
  const longitudeDelta = toRad(lon2 - lon1)
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(longitudeDelta / 2) ** 2

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a))
}

export function bearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const toDeg = (value: number) => (value * 180) / Math.PI
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2))
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.cos(toRad(lon2 - lon1))

  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export function levelFromXp(xp: number) {
  if (xp >= 3_500) return 'Sanskriti Master'
  if (xp >= 2_000) return 'History Keeper'
  if (xp >= 1_000) return 'Culture Guardian'
  if (xp >= 500) return 'Monument Seeker'
  return 'Heritage Explorer'
}

export function badgesFromXp(xp: number) {
  return [
    { name: 'First Steps', unlocked: xp >= 25, threshold: 25, icon: '👣' },
    { name: 'Explorer', unlocked: xp >= 100, threshold: 100, icon: '🧭' },
    { name: 'Quiz Master', unlocked: xp >= 200, threshold: 200, icon: '🧠' },
    { name: 'Hunter', unlocked: xp >= 500, threshold: 500, icon: '🏹' },
    { name: 'Day Tripper', unlocked: xp >= 1_000, threshold: 1_000, icon: '🧳' },
  ]
}
