import { NextResponse } from 'next/server'
import { recognizeMonument } from '@/lib/nvidia'

const MAX_INLINE_MEDIA_BYTES = 175 * 1024

function decodedBase64Size(value: string) {
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  return Math.floor((value.length * 3) / 4) - padding
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { image_b64?: unknown }
    const imageBase64 =
      typeof body.image_b64 === 'string'
        ? body.image_b64.replace(/^data:image\/[^;]+;base64,/, '')
        : ''

    if (!imageBase64) {
      return NextResponse.json({ error: 'An image is required.' }, { status: 400 })
    }

    if (decodedBase64Size(imageBase64) > MAX_INLINE_MEDIA_BYTES) {
      return NextResponse.json(
        { error: 'Image is too large. Please upload a smaller image.' },
        { status: 413 },
      )
    }

    const result = await recognizeMonument(imageBase64)
    return NextResponse.json(result)
  } catch (error) {
    console.error(
      '[NVIDIA vision]',
      error instanceof Error ? error.message : 'Unknown recognition error',
    )
    return NextResponse.json(
      { error: 'Monument recognition is temporarily unavailable.' },
      { status: 502 },
    )
  }
}
