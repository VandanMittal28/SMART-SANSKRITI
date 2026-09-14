import { NextResponse } from 'next/server'
import { isSupportedLanguage } from '@/lib/languages'
import { translateTextsWithNvidia } from '@/lib/nvidia'

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>
    if (!isSupportedLanguage(body.language)) {
      return NextResponse.json({ error: 'A supported language is required.' }, { status: 400 })
    }

    const keys = ['directionHint', 'arrivalFact', 'miniFact'] as const
    if (keys.some((key) => typeof body[key] !== 'string' || String(body[key]).length > 2_000)) {
      return NextResponse.json({ error: 'Complete guide text is required.' }, { status: 400 })
    }

    const translations = await translateTextsWithNvidia(
      keys.map((key) => String(body[key])),
      body.language,
    )
    return NextResponse.json(Object.fromEntries(keys.map((key, index) => [key, translations[index]])))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Guide translation failed.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
