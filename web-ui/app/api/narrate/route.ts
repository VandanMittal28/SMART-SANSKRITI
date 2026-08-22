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

interface CachedNarration {
  result: AudioResult
  engine: string
}

const audioCache = new Map<string, CachedNarration>()
const pendingAudio = new Map<string, Promise<CachedNarration>>()
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

function audioResponse(result: AudioResult, profile: NarratorProfile, engine: string) {
  return new Response(Uint8Array.from(result.audio).buffer, {
    status: 200,
    headers: {
      'Content-Type': result.contentType,
      'Cache-Control': 'private, max-age=86400',
      'X-Narrator-Profile': profile,
      'X-Narration-Engine': engine,
      'X-AI-Generated-Audio': 'true',
    },
  })
}

// Premade ElevenLabs voices, picked per narrator persona. eleven_turbo_v2_5
// is multilingual and auto-detects the spoken language from the input text,
// so the same voice works across every supported language without swapping
// voice IDs per locale.
const ELEVENLABS_VOICE_BY_PROFILE: Record<NarratorProfile, string> = {
  'mughal-court': 'onwK4e9ZLuTAKqWW03F9', // Daniel — formal, deeper male voice
  'temple-scholar': '21m00Tcm4TlvDq8ikWAM', // Rachel — calm, measured
  'neutral-guide': 'EXAVITQu4vr4xnSDxMaL', // Bella — warm, friendly
}

async function requestElevenLabsNarration(
  text: string,
  profile: NarratorProfile,
): Promise<AudioResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not configured')

  const voiceId = ELEVENLABS_VOICE_BY_PROFILE[profile]
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`ElevenLabs upstream ${response.status}: ${message.slice(0, 240)}`)
  }

  return {
    audio: new Uint8Array(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') || 'audio/mpeg',
  }
}

async function requestChatterboxNarration(
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

// Tries ElevenLabs first when configured (fast, reliable, multilingual).
// Falls back to the self-hosted NVIDIA Chatterbox proxy otherwise, so
// nothing breaks for a deployment that only has the NVIDIA key.
async function requestNarration(
  text: string,
  language: NarrationLanguage,
  profile: NarratorProfile,
): Promise<{ result: AudioResult; engine: string }> {
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      const result = await requestElevenLabsNarration(text, profile)
      return { result, engine: 'elevenlabs' }
    } catch (error) {
      console.warn(
        '[Narration] ElevenLabs failed, falling back to Chatterbox:',
        error instanceof Error ? error.message : error,
      )
    }
  }

  const result = await requestChatterboxNarration(text, language, profile)
  return { result, engine: 'chatterbox-api' }
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
      .update(`narration-v2:${profile}:${language}:${text}`)
      .digest('hex')
    const cached = audioCache.get(cacheKey)
    if (cached) return audioResponse(cached.result, profile, cached.engine)

    let narrationPromise = pendingAudio.get(cacheKey)
    if (!narrationPromise) {
      narrationPromise = requestNarration(text, language, profile)
      pendingAudio.set(cacheKey, narrationPromise)
    }

    let cachedNarration: CachedNarration
    try {
      cachedNarration = await narrationPromise
    } finally {
      pendingAudio.delete(cacheKey)
    }

    if (audioCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = audioCache.keys().next().value
      if (oldestKey) audioCache.delete(oldestKey)
    }
    audioCache.set(cacheKey, cachedNarration)
    return audioResponse(cachedNarration.result, profile, cachedNarration.engine)
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
