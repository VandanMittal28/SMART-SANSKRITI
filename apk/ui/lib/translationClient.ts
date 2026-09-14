'use client'

import { type SupportedLanguage } from '@/lib/languages'
import { hasNativeNvidia, translateTextsNative } from '@/lib/nativeNvidia'

const CACHE_VERSION = 'v6'
const STORAGE_PREFIX = `sanskriti-site-translation-${CACHE_VERSION}:`
const memoryCaches = new Map<SupportedLanguage, Record<string, string>>()
const pendingBatches = new Map<string, Promise<string[]>>()

function readCache(language: SupportedLanguage): Record<string, string> {
  const existing = memoryCaches.get(language)
  if (existing) return existing

  let cache: Record<string, string> = {}
  if (typeof window !== 'undefined') {
    try {
      const parsed = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${language}`) || '{}') as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        cache = Object.fromEntries(
          Object.entries(parsed).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string' && Boolean(entry[1].trim()),
          ),
        )
      }
    } catch {
      cache = {}
    }
  }
  memoryCaches.set(language, cache)
  return cache
}

function saveCache(language: SupportedLanguage, cache: Record<string, string>) {
  memoryCaches.set(language, cache)
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${language}`, JSON.stringify(cache))
  } catch {
    // The in-memory copy still avoids duplicate work for this session.
  }
}

export function getCachedTranslation(text: string, language: SupportedLanguage): string | undefined {
  if (language === 'en') return text
  return readCache(language)[text.trim()]
}

async function requestTranslation(texts: string[], language: SupportedLanguage): Promise<string[]> {
  if (hasNativeNvidia()) return translateTextsNative(texts, language)

  const response = await fetch('/api/site-translate/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, texts }),
  })
  const data = await response.json() as { translations?: unknown; error?: string }
  if (!response.ok || !Array.isArray(data.translations) || data.translations.length !== texts.length) {
    throw new Error(data.error || 'Translation service returned an incomplete response.')
  }
  return data.translations.map((value, index) =>
    typeof value === 'string' && value.trim() ? value.trim() : texts[index],
  )
}

export async function translateTexts(
  texts: string[],
  language: SupportedLanguage,
): Promise<string[]> {
  if (language === 'en' || texts.length === 0) return texts

  const cache = readCache(language)
  const normalized = texts.map((text) => text.trim())
  const missing = [...new Set(normalized.filter((text) => text && !cache[text]))]

  if (missing.length > 0) {
    const batchKey = `${language}:${JSON.stringify(missing)}`
    let pending = pendingBatches.get(batchKey)
    if (!pending) {
      pending = requestTranslation(missing, language)
      pendingBatches.set(batchKey, pending)
    }

    try {
      const translated = await pending
      missing.forEach((source, index) => {
        const value = translated[index]
        if (value?.trim()) cache[source] = value.trim()
      })
      saveCache(language, cache)
    } finally {
      pendingBatches.delete(batchKey)
    }
  }

  return normalized.map((source, index) => cache[source] || texts[index])
}

export async function translateText(text: string, language: SupportedLanguage): Promise<string> {
  const [translated] = await translateTexts([text], language)
  return translated || text
}
