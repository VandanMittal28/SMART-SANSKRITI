import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { askNvidia } from '@/lib/nvidia'
import {
  getLanguageConfig,
  isSupportedLanguage,
  SupportedLanguage,
} from '@/lib/languages'

export const runtime = 'nodejs'

interface TranslationRequest {
  language?: unknown
  texts?: unknown
}

const translationCache = new Map<string, string>()
const MAX_CACHE_ENTRIES = 4_000
const MAX_TEXTS = 60
const MAX_TOTAL_CHARACTERS = 18_000
const TARGET_LANGUAGE_HINTS: Partial<Record<SupportedLanguage, string>> = {
  ar: 'Arabic glossary: monument = معلم أثري; heritage = تراث; map = خريطة; guide = دليل; ticket = تذكرة. Never output the Latin-script word "monumento".',
}

function cacheKey(language: SupportedLanguage, text: string) {
  return createHash('sha256').update(`site-v4:${language}:${text}`).digest('hex')
}

function parseTranslations(raw: string, expectedCount: number): string[] {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')

  if (start < 0 || end <= start) {
    throw new Error('Site translation response did not contain a JSON array')
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as unknown
  if (
    !Array.isArray(parsed)
    || parsed.length !== expectedCount
    || parsed.some((value) => typeof value !== 'string' || !value.trim())
  ) {
    throw new Error('Site translation response shape was invalid')
  }

  return parsed.map((value) => String(value).trim())
}

function storeTranslation(key: string, value: string) {
  if (translationCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = translationCache.keys().next().value
    if (oldestKey) translationCache.delete(oldestKey)
  }
  translationCache.set(key, value)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TranslationRequest
    if (!isSupportedLanguage(body.language)) {
      return NextResponse.json({ error: 'Unsupported language.' }, { status: 400 })
    }
    const languageId = body.language

    const texts = Array.isArray(body.texts)
      ? body.texts
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
      : []

    if (!texts.length || texts.length > MAX_TEXTS || texts.some((text) => !text)) {
      return NextResponse.json(
        { error: `Provide between 1 and ${MAX_TEXTS} non-empty strings.` },
        { status: 400 },
      )
    }

    if (texts.reduce((total, text) => total + text.length, 0) > MAX_TOTAL_CHARACTERS) {
      return NextResponse.json({ error: 'Translation batch is too large.' }, { status: 413 })
    }

    if (languageId === 'en') {
      return NextResponse.json({ translations: texts })
    }

    const translations = new Array<string>(texts.length)
    const missingTexts: string[] = []
    const missingIndexes: number[] = []

    texts.forEach((text, index) => {
      const cached = translationCache.get(cacheKey(languageId, text))
      if (cached) {
        translations[index] = cached
      } else {
        missingTexts.push(text)
        missingIndexes.push(index)
      }
    })

    if (missingTexts.length) {
      const language = getLanguageConfig(languageId)
      const raw = await askNvidia(
        [
          `Translate every string in the JSON array into natural ${language.name}.`,
          'These are labels and short passages from an Indian heritage application.',
          'Translate every ordinary word, including generic words such as monument, map, guide, ticket, explore, and heritage.',
          'Use only the target language except for these protected items: Sanskriti AI, SANSKRITI BOT, NVIDIA, XP, URLs, emoji, numbers, dates, measurements, and established proper names such as Taj Mahal.',
          TARGET_LANGUAGE_HINTS[languageId] || '',
          'Do not add explanations or facts. Preserve the input order and item count.',
          'Return only a valid JSON array of translated strings.',
          JSON.stringify(missingTexts),
        ].join('\n'),
        '',
        languageId,
        { maxTokens: 6_000 },
      )
      const translatedMissing = parseTranslations(raw, missingTexts.length)

      translatedMissing.forEach((translated, missingIndex) => {
        const originalIndex = missingIndexes[missingIndex]
        translations[originalIndex] = translated
        storeTranslation(cacheKey(languageId, texts[originalIndex]), translated)
      })
    }

    return NextResponse.json({ translations })
  } catch (error) {
    console.error(
      '[Site translation]',
      error instanceof Error ? error.message : 'Unknown translation error',
    )
    return NextResponse.json(
      { error: 'Site translation is temporarily unavailable.' },
      { status: 502 },
    )
  }
}
