import { NextResponse } from 'next/server'
import { askNvidia } from '@/lib/nvidia'
import {
  getQuizQuestions,
  hasCuratedQuiz,
  resolveQuizMonumentId,
  type QuizQuestion,
} from '@/lib/quizQuestions'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const monumentId = searchParams.get('monument_id')?.trim() || 'taj-mahal'
  const resolvedMonumentId = resolveQuizMonumentId(monumentId)
  const questions = getQuizQuestions(resolvedMonumentId)

  return NextResponse.json({
    monument_id: resolvedMonumentId,
    questions: questions.length > 0 ? questions : getQuizQuestions('taj-mahal'),
  })
}

interface QuizRequest {
  monument_id?: unknown
  monument_name?: unknown
  summary?: unknown
  location?: unknown
  era_or_dynasty?: unknown
  architecture_style?: unknown
  category?: unknown
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseJsonObject(content: string) {
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Quiz response was not JSON.')
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>
}

function validateQuestions(value: Record<string, unknown>): QuizQuestion[] {
  if (!Array.isArray(value.questions)) throw new Error('Quiz questions were missing.')

  const questions = value.questions.slice(0, 3).map((item, index) => {
    if (!item || typeof item !== 'object') return null
    const question = item as Record<string, unknown>
    const prompt = text(question.question)
    const options = Array.isArray(question.options)
      ? question.options.map(text).filter(Boolean).slice(0, 4)
      : []
    const correctIndex = Number(question.correct_index)

    if (
      !prompt ||
      options.length !== 4 ||
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex > 3
    ) {
      return null
    }

    return {
      id: `generated-${index + 1}`,
      question: prompt,
      options,
      correct_index: correctIndex,
    }
  }).filter((question): question is QuizQuestion => Boolean(question))

  if (questions.length !== 3) throw new Error('Quiz response was incomplete.')
  return questions
}

function contextualFallback(
  monumentId: string,
  monumentName: string,
  summary: string,
  location: string,
  architecture: string,
): QuizQuestion[] {
  const otherMonuments = ['Taj Mahal', 'Red Fort', 'Qutub Minar']
    .filter((name) => name !== monumentName)
    .slice(0, 3)
  const nameOptions = [monumentName, ...otherMonuments]
  while (nameOptions.length < 4) nameOptions.push('India Gate')

  const questions: QuizQuestion[] = [
    {
      id: `${monumentId}-recognized`,
      question: 'Which monument was identified in the photo?',
      options: nameOptions,
      correct_index: 0,
    },
  ]

  if (location) {
    questions.push({
      id: `${monumentId}-location`,
      question: `Where is ${monumentName} located?`,
      options: [location, 'New Delhi', 'Mumbai, Maharashtra', 'Jaipur, Rajasthan']
        .filter((value, index, values) => values.indexOf(value) === index)
        .concat(['Kolkata, West Bengal'])
        .slice(0, 4),
      correct_index: 0,
    })
  }

  questions.push({
    id: `${monumentId}-description`,
    question: `Which description best matches ${monumentName}?`,
    options: [
      summary || architecture || `It is a heritage site known as ${monumentName}.`,
      'A modern sports stadium built in the twenty-first century.',
      'A contemporary railway terminal with no historical role.',
      'A recently constructed commercial shopping complex.',
    ],
    correct_index: 0,
  })

  while (questions.length < 3) {
    questions.push({
      id: `${monumentId}-architecture`,
      question: `Which architectural description is associated with ${monumentName}?`,
      options: [
        architecture || 'Historic Indian heritage architecture',
        'Contemporary glass skyscraper design',
        'Modern industrial warehouse design',
        'Twenty-first-century airport architecture',
      ],
      correct_index: 0,
    })
  }

  return questions.slice(0, 3)
}

export async function POST(request: Request) {
  let body: QuizRequest

  try {
    body = (await request.json()) as QuizRequest
  } catch {
    return NextResponse.json({ error: 'A valid JSON body is required.' }, { status: 400 })
  }

  const monumentName = text(body.monument_name) || 'the identified monument'
  const monumentId = resolveQuizMonumentId(
    text(body.monument_id) || monumentName,
  )
  const curated = getQuizQuestions(monumentId)

  if (hasCuratedQuiz(monumentId)) {
    return NextResponse.json({ monument_id: monumentId, questions: curated })
  }

  const summary = text(body.summary)
  const location = text(body.location)
  const era = text(body.era_or_dynasty)
  const architecture = text(body.architecture_style)
  const category = text(body.category)
  const fallback = contextualFallback(
    monumentId,
    monumentName,
    summary,
    location,
    architecture,
  )

  const prompt = `Create exactly 3 factual multiple-choice questions about ${monumentName}.
Use only this recognition context:
Location: ${location || 'not provided'}
Era or dynasty: ${era || 'not provided'}
Architecture: ${architecture || 'not provided'}
Category: ${category || 'not provided'}
Summary: ${summary || 'not provided'}
Return only JSON in this shape:
{"questions":[{"question":"...","options":["...","...","...","..."],"correct_index":0}]}
Each question must have exactly 4 options and one correct_index from 0 to 3.
Do not invent facts that are absent from the context or not well established.`

  try {
    const answer = await askNvidia(prompt, monumentId, 'en', { maxTokens: 1_200 })
    return NextResponse.json({
      monument_id: monumentId,
      questions: validateQuestions(parseJsonObject(answer)),
    })
  } catch (error) {
    console.warn(
      '[NVIDIA quiz fallback]',
      error instanceof Error ? error.message : 'Unknown quiz error',
    )
    return NextResponse.json({ monument_id: monumentId, questions: fallback })
  }
}
