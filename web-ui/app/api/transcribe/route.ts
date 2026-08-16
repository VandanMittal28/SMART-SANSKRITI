import { NextResponse } from 'next/server'
import { transcribeAudio } from '@/lib/nvidia'

const MAX_INLINE_MEDIA_BYTES = 175 * 1024

function decodedBase64Size(value: string) {
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  return Math.floor((value.length * 3) / 4) - padding
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      audio_b64?: unknown
      language?: unknown
    }
    const audioBase64 =
      typeof body.audio_b64 === 'string'
        ? body.audio_b64.replace(/^data:audio\/[^;]+;base64,/, '')
        : ''

    if (!audioBase64) {
      return NextResponse.json({ error: 'Audio is required.' }, { status: 400 })
    }

    if (decodedBase64Size(audioBase64) > MAX_INLINE_MEDIA_BYTES) {
      return NextResponse.json(
        { error: 'Recording is too long. Please keep it under five seconds.' },
        { status: 413 },
      )
    }

    const language = body.language === 'hi' ? 'hi' : 'en'
    const transcript = await transcribeAudio(audioBase64, language)
    return NextResponse.json({ text: transcript })
  } catch (error) {
    console.error(
      '[NVIDIA speech]',
      error instanceof Error ? error.message : 'Unknown transcription error',
    )
    return NextResponse.json(
      { error: 'Speech recognition is temporarily unavailable.' },
      { status: 502 },
    )
  }
}
