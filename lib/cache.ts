// In-memory cache for current session (fastest)
const memoryCache = new Map<string, { data: any, timestamp: number }>()

// Cache duration in ms
export const CACHE_DURATION = {
  recognition: 24 * 60 * 60 * 1000,  // 24 hours (same image = same monument)
  chat: 30 * 60 * 1000,               // 30 mins (same question = same answer)
  nearby: 10 * 60 * 1000,             // 10 mins (monument list)
}

// Generate cache key for image (use file size + name as fingerprint)
export function getImageCacheKey(file: File): string {
  return `recognition_${file.name}_${file.size}_${file.lastModified}`
}

// Generate cache key for chat
export function getChatCacheKey(question: string, monumentId: string): string {
  return `chat_${monumentId}_${question.toLowerCase().trim().replace(/\s+/g, '_').slice(0, 50)}`
}

// Get from cache (memory first, then localStorage)
export function getCache(key: string, duration: number): any | null {
  // Check memory cache first (fastest)
  const memItem = memoryCache.get(key)
  if (memItem && Date.now() - memItem.timestamp < duration) {
    console.log('✅ Cache HIT (memory):', key)
    return memItem.data
  }

  // Check localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Date.now() - parsed.timestamp < duration) {
          console.log('✅ Cache HIT (localStorage):', key)
          // Promote to memory cache
          memoryCache.set(key, parsed)
          return parsed.data
        } else {
          // Expired — clean up
          localStorage.removeItem(key)
        }
      }
    } catch (e) {}
  }

  console.log('❌ Cache MISS:', key)
  return null
}

// Set cache (both memory and localStorage)
export function setCache(key: string, data: any): void {
  const item = { data, timestamp: Date.now() }
  
  // Always set memory cache
  memoryCache.set(key, item)

  // Try localStorage (may fail if storage full)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(item))
    } catch (e) {
      // localStorage full — clear old recognition caches
      clearOldCaches()
    }
  }
}

// Clear old caches to free space
export function clearOldCaches(): void {
  if (typeof window === 'undefined') return
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('recognition_') || 
          key.startsWith('chat_') ||
          key.startsWith('nearby_')) {
        localStorage.removeItem(key)
      }
    })
  } catch (e) {}
}
