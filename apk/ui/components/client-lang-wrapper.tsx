'use client'
import { useEffect } from 'react'
import { useLang } from '@/lib/languageContext'
import { getLanguageConfig } from '@/lib/languages'
import { hasNativeNvidia, translateTextsNative } from '@/lib/nativeNvidia'

const CACHE_VERSION = 'v4'
const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label'] as const
const TRANSLATION_BATCH_SIZE = 10

function shouldSkip(element: Element | null) {
  return !element
    || Boolean(element.closest('script, style, noscript, [data-no-translate]'))
}

function shouldTranslate(text: string) {
  return text.length > 1 && /[A-Za-z]/.test(text)
}

export function ClientLangWrapper() {
  const { lang } = useLang()

  useEffect(() => {
    const language = getLanguageConfig(lang)
    document.documentElement.lang = language.locale
    document.documentElement.dir = 'rtl' in language && language.rtl ? 'rtl' : 'ltr'
    document.documentElement.setAttribute('data-lang', lang)
  }, [lang])

  useEffect(() => {
    if (lang === 'en') return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let translating = false
    let rerunRequested = false
    const originalText = new Map<Text, string>()
    const originalAttributes = new Map<Element, Map<string, string>>()
    const storageKey = `sanskriti-site-translation-${CACHE_VERSION}:${lang}`
    let cache: Record<string, string> = {}

    try {
      cache = JSON.parse(localStorage.getItem(storageKey) || '{}') as Record<string, string>
    } catch {
      cache = {}
    }

    const restore = () => {
      originalText.forEach((source, node) => {
        if (node.isConnected) node.nodeValue = source
      })
      originalAttributes.forEach((attributes, element) => {
        if (!element.isConnected) return
        attributes.forEach((source, attribute) => element.setAttribute(attribute, source))
      })
    }

    const translatePage = async () => {
      if (cancelled) return
      if (translating) {
        rerunRequested = true
        return
      }
      translating = true

      try {
        const targets = new Map<string, Array<() => void>>()
        const register = (source: string, apply: (translated: string) => void) => {
          const normalized = source.trim()
          if (!shouldTranslate(normalized)) return
          const setters = targets.get(normalized) || []
          setters.push(() => apply(cache[normalized] || normalized))
          targets.set(normalized, setters)
        }

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        let current = walker.nextNode()
        while (current) {
          const node = current as Text
          const parent = node.parentElement
          if (!shouldSkip(parent)) {
            const source = originalText.get(node) || node.nodeValue || ''
            if (!originalText.has(node)) originalText.set(node, source)
            register(source, (translated) => {
              const leading = source.match(/^\s*/)?.[0] || ''
              const trailing = source.match(/\s*$/)?.[0] || ''
              const nextValue = `${leading}${translated}${trailing}`
              if (node.nodeValue !== nextValue) node.nodeValue = nextValue
            })
          }
          current = walker.nextNode()
        }

        document.body.querySelectorAll('*').forEach((element) => {
          if (shouldSkip(element)) return
          TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
            const currentValue = element.getAttribute(attribute)
            if (!currentValue) return
            let originals = originalAttributes.get(element)
            if (!originals) {
              originals = new Map()
              originalAttributes.set(element, originals)
            }
            const source = originals.get(attribute) || currentValue
            if (!originals.has(attribute)) originals.set(attribute, source)
            register(source, (translated) => {
              if (element.getAttribute(attribute) !== translated) {
                element.setAttribute(attribute, translated)
              }
            })
          })
        })

        // Paint cached translations immediately so navigating between screens does
        // not briefly switch the app back to English.
        targets.forEach((setters) => setters.forEach((apply) => apply()))

        const missing = [...targets.keys()].filter((text) => !cache[text])
        for (let offset = 0; offset < missing.length && !cancelled; offset += TRANSLATION_BATCH_SIZE) {
          const batch = missing.slice(offset, offset + TRANSLATION_BATCH_SIZE)
          try {
            let translatedBatch: unknown[]
            if (hasNativeNvidia()) {
              translatedBatch = await translateTextsNative(batch, lang)
            } else {
              const response = await fetch('/api/site-translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: lang, texts: batch }),
              })
              if (!response.ok) continue
              const data = await response.json() as { translations?: unknown }
              if (!Array.isArray(data.translations) || data.translations.length !== batch.length) continue
              translatedBatch = data.translations
            }
            batch.forEach((source, index) => {
              const translated = translatedBatch[index]
              if (typeof translated === 'string' && translated.trim()) {
                cache[source] = translated.trim()
                targets.get(source)?.forEach((apply) => apply())
              }
            })
            try {
              localStorage.setItem(storageKey, JSON.stringify(cache))
            } catch {
              // In-memory translation still works when storage is unavailable.
            }
          } catch {
            // Keep the original copy when translation is temporarily unavailable.
          }
        }
      } finally {
        translating = false
        if (rerunRequested && !cancelled) {
          rerunRequested = false
          scheduleTranslation()
        }
      }
    }

    const scheduleTranslation = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void translatePage(), 120)
    }

    const observer = new MutationObserver(scheduleTranslation)
    observer.observe(document.body, { childList: true, characterData: true, subtree: true })
    scheduleTranslation()

    return () => {
      cancelled = true
      observer.disconnect()
      if (timer) clearTimeout(timer)
      restore()
    }
  }, [lang])

  return null
}
