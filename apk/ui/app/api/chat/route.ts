import { NextResponse } from 'next/server'
import { askHeritageChat } from '@/lib/nvidia'
import { isSupportedLanguage } from '@/lib/languages'

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>
    const question = typeof body.question === 'string' ? body.question.trim() : ''
    const monumentId = typeof body.monument_id === 'string' ? body.monument_id : ''
    const language = isSupportedLanguage(body.lang) ? body.lang : 'en'
    if (!question || question.length > 2_000) {
      return NextResponse.json({ error: 'A valid question is required.' }, { status: 400 })
    }
    const answer = await askHeritageChat(question, monumentId, language)
    return NextResponse.json({ answer, response: answer })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Heritage guide failed.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
