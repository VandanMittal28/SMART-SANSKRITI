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
  monumentId?: unknown
  directionHint?: unknown
  arrivalFact?: unknown
  miniFact?: unknown
}

interface GuideTranslation {
  directionHint: string
  arrivalFact: string
  miniFact: string
}

const translationCache = new Map<string, GuideTranslation>()
const MAX_CACHE_ENTRIES = 160
const TRANSLATION_VERSION = 5

const PROTECTED_TERMS: Record<string, string[]> = {
  'taj-mahal': [
    'Taj Mahal = ताजमहल',
    'Shah Jahan = शाहजहाँ',
    'Mumtaz Mahal = मुमताज़ महल',
    'Yamuna = यमुना',
    'Darwaza-i-Rauza = दरवाज़ा-ए-रौज़ा',
    'Mahtab Bagh = मेहताब बाग़',
  ],
  'red-fort': [
    'Red Fort = लाल किला',
    'Use the grammatically inflected form लाल किले का/के/की when followed by a postposition; never write लाल किला का',
    'Shah Jahan = शाहजहाँ',
    'Aurangzeb = औरंगज़ेब',
    'Lahori Gate = लाहौरी दरवाज़ा',
    'Diwan-i-Aam = दीवान-ए-आम',
    'Diwan-i-Khas = दीवान-ए-ख़ास',
    'Yamuna = यमुना',
  ],
  'qutub-minar': [
    'Qutub Minar = क़ुतुब मीनार',
    'Qutb-ud-din Aibak = क़ुतुबुद्दीन ऐबक',
    'Iltutmish = इल्तुतमिश',
    'Alauddin Khalji = अलाउद्दीन ख़िलजी',
    'Firoz Shah Tughlaq = फ़िरोज़ शाह तुग़लक़',
    'Alai Darwaza = अलाई दरवाज़ा',
  ],
  konark: [
    'Konark = कोणार्क (never कोंकण)',
    'Konark Sun Temple = कोणार्क सूर्य मंदिर',
    'Surya = सूर्य',
    'King Narasimhadeva I = राजा नरसिंहदेव प्रथम',
    'Odisha = ओडिशा',
    'Kalinga = कलिंग',
    'Jagamohana = जगमोहन',
    'Natya Mandapa = नाट्य मंडप',
    'Chandrabhaga = चंद्रभागा',
  ],
}

const ARCHITECTURE_GLOSSARY = [
  'red sandstone = लाल बलुआ पत्थर',
  'sandstone = बलुआ पत्थर',
  'marble = संगमरमर',
  'gateway = प्रवेश द्वार',
  'archway = मेहराबदार द्वार',
  'minaret = मीनार',
  'pavilion = मंडप',
  'sanctum = गर्भगृह',
  'assembly hall = सभा मंडप',
  'courtyard = प्रांगण',
  'stepwell = बावली',
  'barbican = बाहरी सुरक्षा प्राचीर',
  'inscription = अभिलेख',
  'dynasty = राजवंश',
  'century = शताब्दी',
]

function extractNumbers(value: string) {
  return value.match(/\d+/g) || []
}

function preservesNumbers(source: string, translated: string) {
  const translatedNumbers = new Set(extractNumbers(translated))
  return extractNumbers(source).every(number => translatedNumbers.has(number))
}

function normalizeHindi(value: string) {
  return value
    .replace(
      /barbican\s*\(बाहरी सुरक्षा प्राचीर\)/gi,
      'बाहरी सुरक्षा प्राचीर',
    )
    .replace(/\bbarbican\b/gi, 'बाहरी सुरक्षा प्राचीर')
    .replace(/\bred sandstone\b/gi, 'लाल बलुआ पत्थर')
    .replace(/\bsandstone\b/gi, 'बलुआ पत्थर')
    .replace(/\bassembly hall\b/gi, 'सभा मंडप')
    .replace(/\bstepwell\b/gi, 'बावली')
    .replace(/प्राचीर जोड़ा/g, 'प्राचीर जोड़ी')
}

function parseTranslation(raw: string, language: SupportedLanguage): GuideTranslation {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')

  if (start < 0 || end <= start) {
    throw new Error('Translation response did not contain JSON')
  }

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<GuideTranslation>
  if (!parsed.directionHint || !parsed.arrivalFact || !parsed.miniFact) {
    throw new Error('Translation response is missing guide fields')
  }

  return {
    directionHint: language === 'hi'
      ? normalizeHindi(parsed.directionHint.trim())
      : parsed.directionHint.trim(),
    arrivalFact: language === 'hi'
      ? normalizeHindi(parsed.arrivalFact.trim())
      : parsed.arrivalFact.trim(),
    miniFact: language === 'hi'
      ? normalizeHindi(parsed.miniFact.trim())
      : parsed.miniFact.trim(),
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TranslationRequest
    if (!isSupportedLanguage(body.language)) {
      return NextResponse.json({ error: 'Unsupported language.' }, { status: 400 })
    }
    const language = body.language
    const monumentId =
      typeof body.monumentId === 'string' ? body.monumentId.trim() : ''
    const directionHint =
      typeof body.directionHint === 'string' ? body.directionHint.trim() : ''
    const arrivalFact =
      typeof body.arrivalFact === 'string' ? body.arrivalFact.trim() : ''
    const miniFact = typeof body.miniFact === 'string' ? body.miniFact.trim() : ''

    if (!directionHint || !arrivalFact || !miniFact) {
      return NextResponse.json(
        { error: 'All guide text fields are required.' },
        { status: 400 },
      )
    }

    const combinedLength = directionHint.length + arrivalFact.length + miniFact.length
    if (combinedLength > 4_000) {
      return NextResponse.json(
        { error: 'Guide text is too long to translate.' },
        { status: 400 },
      )
    }

    const cacheKey = createHash('sha256')
      .update(`${TRANSLATION_VERSION}:${language}:${monumentId}:${directionHint}:${arrivalFact}:${miniFact}`)
      .digest('hex')
    const cached = translationCache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const languageConfig = getLanguageConfig(language)
    const instructions = [
      `Translate the following heritage guide copy into natural, respectful ${languageConfig.name}.`,
      'Preserve names, dates, measurements, emoji, and historical meaning exactly.',
      'Use concise, direct language for walking instructions.',
      'Translate every ordinary English phrase while retaining established proper monument names.',
    ]
    if (language === 'hi') {
      instructions.push(
        'Write in Devanagari and use formal Indian heritage vocabulary: translate "King" as "राजा", never as "किंग".',
        `Architecture glossary: ${ARCHITECTURE_GLOSSARY.join('; ')}`,
        `Mandatory terminology: ${(PROTECTED_TERMS[monumentId] || []).join('; ')}`,
      )
    }
    instructions.push(
      'Do not add facts or commentary. Return only valid JSON using the exact English keys shown.',
      JSON.stringify({ directionHint, arrivalFact, miniFact }),
    )

    const raw = await askNvidia(
      instructions.join('\n'),
      monumentId,
      language,
      { maxTokens: 1_800 },
    )
    const translation = parseTranslation(raw, language)
    if (
      !preservesNumbers(directionHint, translation.directionHint) ||
      !preservesNumbers(arrivalFact, translation.arrivalFact) ||
      !preservesNumbers(miniFact, translation.miniFact)
    ) {
      throw new Error('Guide translation changed a date or measurement')
    }

    if (translationCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = translationCache.keys().next().value
      if (oldestKey) translationCache.delete(oldestKey)
    }
    translationCache.set(cacheKey, translation)

    return NextResponse.json(translation)
  } catch (error) {
    console.error(
      '[Explore translation]',
      error instanceof Error ? error.message : 'Unknown translation error',
    )
    return NextResponse.json(
      { error: 'Guide translation is temporarily unavailable.' },
      { status: 502 },
    )
  }
}
