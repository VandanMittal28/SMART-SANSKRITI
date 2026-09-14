import { NextResponse } from 'next/server'
import { isSupportedLanguage } from '@/lib/languages'
import { translateTextsWithNvidia } from '@/lib/nvidia'

const MAX_ITEMS = 40
const MAX_TEXT_LENGTH = 2_000

export async function POST(request: Request) {
  try {
    const body = await request.json() as { language?: unknown; texts?: unknown }
    if (!isSupportedLanguage(body.language) || !Array.isArray(body.texts)) {
      return NextResponse.json({ error: 'A supported language and text array are required.' }, { status: 400 })
    }

    const texts = body.texts.slice(0, MAX_ITEMS)
    if (
      texts.length !== body.texts.length
      || texts.some((text) => typeof text !== 'string' || text.length > MAX_TEXT_LENGTH)
    ) {
      return NextResponse.json({ error: 'Translation request is too large.' }, { status: 413 })
    }

    const translations = await translateTextsWithNvidia(texts as string[], body.language)
    return NextResponse.json({ translations })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Translation failed.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
