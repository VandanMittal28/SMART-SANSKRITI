export interface StoredMonument {
  id: string
  name: string
  timestamp: number
  summary?: string
  location?: string
  era_or_dynasty?: string
  architecture_style?: string
  category?: string
}

export { monuments, monumentById } from "./monuments"

export function saveMonument(
  id: string,
  name: string,
  details: Partial<Omit<StoredMonument, 'id' | 'name' | 'timestamp'>> = {},
) {
  try {
    const data: StoredMonument = { id, name, timestamp: Date.now(), ...details }
    localStorage.setItem('sanskriti_last_monument', JSON.stringify(data))
  } catch { /* silent */ }
}

export function getMonument(): StoredMonument | null {
  try {
    const saved = localStorage.getItem('sanskriti_last_monument')
    if (!saved) return null
    const data: StoredMonument = JSON.parse(saved)
    // Valid for 24 hours (extended from 2hrs for better demo experience)
    if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
      return data
    }
    return null
  } catch {
    return null
  }
}

export function clearMonument() {
  try {
    localStorage.removeItem('sanskriti_last_monument')
  } catch { /* silent */ }
}

export function monumentNameToId(name: string): string {
  const MAP: Record<string, string> = {
    'Taj Mahal': 'taj-mahal',
    'Red Fort': 'red-fort',
    'Qutub Minar': 'qutub-minar',
    'Gateway of India Mumbai': 'gateway-india',
    'Gateway of India': 'gateway-india',
    'Hampi': 'hampi',
    'Hampi Chariot': 'hampi',
    'Stone Chariot': 'hampi',
    'Stone Chariot Hampi': 'hampi',
    'Vittala Temple Hampi': 'hampi',
    'Golden Temple Amritsar': 'golden-temple',
    'Kedarnath Temple': 'kedarnath',
    'Meenakshi Amman Temple Madurai': 'meenakshi',
    'Meenakshi Amman Temple': 'meenakshi',
    'Mysore Palace': 'mysore-palace',
    'Hawa Mahal Jaipur': 'hawa-mahal',
    'Charminar Hyderabad': 'charminar',
    'Victoria Memorial Kolkata': 'victoria-memorial',
    'Ajanta Caves': 'ajanta',
    'Konark Sun Temple': 'konark',
    'India Gate Delhi': 'india-gate',
    'India Gate': 'india-gate',
    'Ellora Caves': 'ellora-caves',
    'Sanchi Stupa': 'sanchi-stupa',
  }
  return MAP[name] || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}
