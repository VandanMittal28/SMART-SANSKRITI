// On-device storage for demo monuments created via the live GPS zone
// capture flow (app/explore/create). No backend involved: everything a
// presenter records lives in localStorage on the phone they use to record
// it, and is read back by the Explore page the same way built-in monument
// zone data is.

export interface CustomZone {
  id: number
  name: string
  emoji: string
  lat: number
  lng: number
  radius: number
  xp: number
  arrival_fact: string
  direction_hint: string
  mini_fact: string
}

export interface CustomMonument {
  id: string
  name: string
  zones: CustomZone[]
}

const STORAGE_KEY = 'sanskriti-custom-monuments-v1'

function readAll(): Record<string, CustomMonument> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as Record<string, CustomMonument> : {}
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, CustomMonument>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Demo still works in-memory for the current session even if storage is unavailable.
  }
}

export function listCustomMonuments(): CustomMonument[] {
  return Object.values(readAll())
}

export function getCustomMonument(id: string): CustomMonument | null {
  return readAll()[id] ?? null
}

export function upsertCustomMonumentName(id: string, name: string) {
  const all = readAll()
  const existing = all[id] ?? { id, name, zones: [] }
  existing.name = name
  all[id] = existing
  writeAll(all)
  return existing
}

export function addZoneToMonument(monumentId: string, monumentName: string, zone: CustomZone): CustomMonument {
  const all = readAll()
  const existing = all[monumentId] ?? { id: monumentId, name: monumentName, zones: [] }
  existing.name = monumentName || existing.name
  existing.zones = [...existing.zones, zone]
  all[monumentId] = existing
  writeAll(all)
  return existing
}

export function removeZoneFromMonument(monumentId: string, zoneId: number) {
  const all = readAll()
  const existing = all[monumentId]
  if (!existing) return
  existing.zones = existing.zones.filter((zone) => zone.id !== zoneId)
  all[monumentId] = existing
  writeAll(all)
}

export function deleteCustomMonument(monumentId: string) {
  const all = readAll()
  delete all[monumentId]
  writeAll(all)
}
