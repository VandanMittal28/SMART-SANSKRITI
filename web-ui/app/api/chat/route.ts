import { NextResponse } from 'next/server'
import { askHeritageChat } from '@/lib/nvidia'

interface ChatRequest {
  question?: unknown
  monument_id?: unknown
  monumentId?: unknown
  lang?: unknown
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest
    const question = typeof body.question === 'string' ? body.question.trim() : ''

    if (!question) {
      return NextResponse.json(
        { error: 'A non-empty question is required.' },
        { status: 400 },
      )
    }

    if (question.length > 4_000) {
      return NextResponse.json(
        { error: 'Question must be 4,000 characters or fewer.' },
        { status: 400 },
      )
    }

    const rawMonumentId = body.monument_id ?? body.monumentId
    const monumentId = typeof rawMonumentId === 'string' ? rawMonumentId : ''
    const language = typeof body.lang === 'string' ? body.lang : undefined
    const answer = await askHeritageChat(question, monumentId, language)

    return NextResponse.json({ answer, response: answer })
  } catch (error) {
    console.error(
      '[NVIDIA chat]',
      error instanceof Error ? error.message : 'Unknown chat error',
    )

    return NextResponse.json(
      { error: 'The AI guide is temporarily unavailable. Please try again.' },
      { status: 502 },
    )
  }
}
