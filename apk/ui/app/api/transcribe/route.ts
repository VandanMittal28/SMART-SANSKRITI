import { NextResponse } from 'next/server'
import { isSupportedLanguage } from '@/lib/languages'
import { transcribeAudio } from '@/lib/nvidia'

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>
    const audio = typeof body.audio_b64 === 'string' ? body.audio_b64 : ''
    const language = isSupportedLanguage(body.language) ? body.language : 'en'
    if (!audio || audio.length > 18_000_000) {
      return NextResponse.json({ error: 'A valid audio recording is required.' }, { status: 400 })
    }
    const transcript = await transcribeAudio(audio, language)
    return NextResponse.json({ text: transcript })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transcription failed.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
