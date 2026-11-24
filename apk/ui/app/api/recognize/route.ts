import { NextResponse } from 'next/server'
import { recognizeMonument } from '@/lib/nvidia'
import { GeminiError } from '@/lib/gemini'

export const runtime = 'nodejs'
export const maxDuration = 90

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Send the photo as JSON.' }, { status: 415 })
  }
  const text = await request.text()
  if (text.length > 2_100_000) {
    return NextResponse.json({ error: 'That photo is too large.' }, { status: 413 })
  }
  let image: unknown
  try {
    image = JSON.parse(text)?.image_b64
  } catch {
    return NextResponse.json({ error: 'Invalid photo request.' }, { status: 400 })
  }
  if (typeof image !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
    return NextResponse.json({ error: 'A base64 JPEG photo is required.' }, { status: 400 })
  }
  const bytes = Buffer.from(image, 'base64')
  if (bytes.length > 1_500_000) {
    return NextResponse.json({ error: 'That photo is too large.' }, { status: 413 })
  }
  if (bytes.length < 100 || !bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return NextResponse.json({ error: 'Send the photo as a JPEG image.' }, { status: 400 })
  }
  if (!process.env.GEMINI_API_KEY?.trim() && !process.env.NVIDIA_API_KEY?.trim()) {
    return NextResponse.json({ error: 'Recognition is not configured yet.' }, { status: 503 })
  }
  try {
    return NextResponse.json(await recognizeMonument(image))
  } catch (error) {
    if (error instanceof GeminiError) {
      if (error.status === 429) return NextResponse.json({ error: 'The recognition service is busy. Please try again in a minute.', code: 'rate_limited' }, { status: 429, headers: { 'Retry-After': '60' } })
      if (error.status === 401 || error.status === 403) return NextResponse.json({ error: 'The recognition service is not configured correctly.', code: 'ai_rejected' }, { status: 503 })
    }
    console.warn('Recognition provider failed:', error instanceof GeminiError ? `HTTP ${error.status}` : error instanceof Error ? error.name : 'unknown')
    return NextResponse.json({ error: 'The recognition service could not process this photo. Please try again.' }, { status: 502 })
  }
}
