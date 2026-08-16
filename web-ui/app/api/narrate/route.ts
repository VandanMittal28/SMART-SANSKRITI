import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { isSupportedLanguage, SupportedLanguage } from '@/lib/languages'

export const runtime = 'nodejs'

type NarratorProfile = 'mughal-court' | 'temple-scholar' | 'neutral-guide'
type NarrationLanguage = SupportedLanguage

interface NarrationRequest {
  text?: unknown
  monumentId?: unknown
  language?: unknown
}

interface AudioResult {
  audio: Uint8Array
  contentType: string
}

const audioCache = new Map<string, AudioResult>()
const pendingAudio = new Map<string, Promise<AudioResult>>()
const MAX_CACHE_ENTRIES = 32

function getNarratorProfile(monumentId: string): NarratorProfile {
  if (['konark', 'kedarnath', 'meenakshi', 'golden-temple'].includes(monumentId)) {
    return 'temple-scholar'
  }
  if (['taj-mahal', 'red-fort', 'qutub-minar'].includes(monumentId)) {
    return 'mughal-court'
  }
  return 'neutral-guide'
}

function audioResponse(result: AudioResult, profile: NarratorProfile) {
  return new Response(Uint8Array.from(result.audio).buffer, {
    status: 200,
    headers: {
      'Content-Type': result.contentType,
      'Cache-Control': 'private, max-age=86400',
      'X-Narrator-Profile': profile,
      'X-Narration-Engine': 'chatterbox-api',
      'X-AI-Generated-Audio': 'true',
    },
  })
}

async function requestNarration(
  text: string,
  language: NarrationLanguage,
  profile: NarratorProfile,
): Promise<AudioResult> {
  const baseUrl = (process.env.CHATTERBOX_BASE_URL || 'http://127.0.0.1:8000')
    .replace(/\/$/, '')

  const response = await fetch(`${baseUrl}/v1/narrate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.CHATTERBOX_DEMO_TOKEN
        ? { Authorization: `Bearer ${process.env.CHATTERBOX_DEMO_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({ text, language, profile }),
    signal: AbortSignal.timeout(45_000),
    cache: 'no-store',
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Narration upstream ${response.status}: ${message.slice(0, 240)}`)
  }

  return {
    audio: new Uint8Array(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') || 'audio/wav',
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NarrationRequest
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    const monumentId = typeof body.monumentId === 'string' ? body.monumentId : ''
    const language: NarrationLanguage = isSupportedLanguage(body.language)
      ? body.language
      : 'en'

    if (!text) {
      return NextResponse.json({ error: 'Narration text is required.' }, { status: 400 })
    }
    if (text.length > 1_500) {
      return NextResponse.json(
        { error: 'Narration text must be 1,500 characters or fewer.' },
        { status: 400 },
      )
    }

    const profile = getNarratorProfile(monumentId)
    const cacheKey = createHash('sha256')
      .update(`chatterbox-api-v1:${profile}:${language}:${text}`)
      .digest('hex')
    const cached = audioCache.get(cacheKey)
    if (cached) return audioResponse(cached, profile)

    let narrationPromise = pendingAudio.get(cacheKey)
    if (!narrationPromise) {
      narrationPromise = requestNarration(text, language, profile)
      pendingAudio.set(cacheKey, narrationPromise)
    }

    let result: AudioResult
    try {
      result = await narrationPromise
    } finally {
      pendingAudio.delete(cacheKey)
    }

    if (audioCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = audioCache.keys().next().value
      if (oldestKey) audioCache.delete(oldestKey)
    }
    audioCache.set(cacheKey, result)
    return audioResponse(result, profile)
  } catch (error) {
    console.error(
      '[Narration]',
      error instanceof Error ? error.message : 'Unknown narration error',
    )
    return NextResponse.json(
      { error: 'Narration is temporarily unavailable.' },
      { status: 502 },
    )
  }
}
