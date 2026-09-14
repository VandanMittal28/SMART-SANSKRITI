'use client'
import { useEffect } from 'react'
import { useLang } from '@/lib/languageContext'
import { getLanguageConfig } from '@/lib/languages'
import { getCachedTranslation, translateTexts } from '@/lib/translationClient'

const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label'] as const
const TRANSLATION_BATCH_SIZE = 32
// NVIDIA Riva Translate covers 20 of the 23 menu languages. Keep the three
// general-model fallbacks in smaller batches so long pages do not exceed the
// model response window and can paint progressively.
const GENERAL_MODEL_BATCH_SIZE = 10
const GENERAL_MODEL_LANGUAGES = new Set(['he', 'ms', 'sw'])

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
    let retryDelay = 2_000
    const originalText = new Map<Text, string>()
    const originalAttributes = new Map<Element, Map<string, string>>()
    const appliedText = new WeakMap<Text, string>()
    const appliedAttributes = new WeakMap<Element, Map<string, string>>()
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
          setters.push(() => apply(getCachedTranslation(normalized, lang) || normalized))
          targets.set(normalized, setters)
        }

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        let current = walker.nextNode()
        while (current) {
          const node = current as Text
          const parent = node.parentElement
          if (!shouldSkip(parent)) {
            const currentValue = node.nodeValue || ''
            const lastApplied = appliedText.get(node)
            const source = lastApplied === currentValue
              ? (originalText.get(node) || currentValue)
              : currentValue
            if (lastApplied !== currentValue || !originalText.has(node)) originalText.set(node, source)
            register(source, (translated) => {
              const leading = source.match(/^\s*/)?.[0] || ''
              const trailing = source.match(/\s*$/)?.[0] || ''
              const nextValue = `${leading}${translated}${trailing}`
              appliedText.set(node, nextValue)
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
            let applied = appliedAttributes.get(element)
            if (!applied) {
              applied = new Map()
              appliedAttributes.set(element, applied)
            }
            const source = applied.get(attribute) === currentValue
              ? (originals.get(attribute) || currentValue)
              : currentValue
            if (applied.get(attribute) !== currentValue || !originals.has(attribute)) {
              originals.set(attribute, source)
            }
            register(source, (translated) => {
              applied?.set(attribute, translated)
              if (element.getAttribute(attribute) !== translated) {
                element.setAttribute(attribute, translated)
              }
            })
          })
        })

        // Paint cached translations immediately so navigating between screens does
        // not briefly switch the app back to English.
        targets.forEach((setters) => setters.forEach((apply) => apply()))

        const missing = [...targets.keys()].filter((text) => !getCachedTranslation(text, lang))
        const batchSize = GENERAL_MODEL_LANGUAGES.has(lang)
          ? GENERAL_MODEL_BATCH_SIZE
          : TRANSLATION_BATCH_SIZE
        for (let offset = 0; offset < missing.length && !cancelled; offset += batchSize) {
          const batch = missing.slice(offset, offset + batchSize)
          try {
            const translatedBatch = await translateTexts(batch, lang)
            if (cancelled) return
            retryDelay = 2_000
            batch.forEach((source, index) => {
              const translated = translatedBatch[index]
              if (typeof translated === 'string' && translated.trim()) {
                targets.get(source)?.forEach((apply) => apply())
              }
            })
          } catch {
            // Trial endpoints can be temporarily busy. Keep the source copy on
            // screen and retry with backoff instead of leaving the page stuck in
            // English until the visitor navigates again.
            if (!cancelled) {
              scheduleTranslation(retryDelay)
              retryDelay = Math.min(retryDelay * 2, 30_000)
            }
            return
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

    const scheduleTranslation = (delay = 120) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void translatePage(), delay)
    }

    const observer = new MutationObserver(() => scheduleTranslation())
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
