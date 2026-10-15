import { NextResponse } from 'next/server'
import { assessHeritageScene } from '@/lib/nvidia'

/** Keyframes are downscaled client-side; this bounds a malformed request. */
const MAX_IMAGE_BYTES = 1_500_000

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>
    const image = body.image

    if (typeof image !== 'string' || !image) {
      return NextResponse.json({ error: 'A base64 JPEG frame is required.' }, { status: 400 })
    }
    if (image.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Frame exceeds the size limit.' }, { status: 413 })
    }
    // Reject anything that is not raw base64 before paying for a model call.
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
      return NextResponse.json({ error: 'Frame must be raw base64 JPEG data.' }, { status: 400 })
    }

    const region = typeof body.region === 'string' && body.region ? body.region : null
    if (region && (region.length > MAX_IMAGE_BYTES || !/^[A-Za-z0-9+/]+={0,2}$/.test(region))) {
      return NextResponse.json({ error: 'Region crop must be raw base64 JPEG data.' }, { status: 400 })
    }
    const motionContext =
      typeof body.motionContext === 'string' ? body.motionContext.slice(0, 400) : null

    return NextResponse.json(await assessHeritageScene({
      imageBase64: image,
      regionBase64: region,
      motionContext,
    }))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scene assessment failed.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
