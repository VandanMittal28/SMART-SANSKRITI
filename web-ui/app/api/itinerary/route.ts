import { NextResponse } from 'next/server'
import { askNvidia } from '@/lib/nvidia'
import {
  generateLocalItinerary,
  type HeritageItinerary,
  type ItineraryActivity,
  type ItineraryDay,
} from '@/lib/itinerary'

interface ItineraryRequest {
  city?: unknown
  days?: unknown
  monument_id?: unknown
  city_highlights?: unknown
  lang?: unknown
}

function parseJsonObject(content: string) {
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')

  if (start < 0 || end <= start) {
    throw new Error('The itinerary response was not valid JSON.')
  }

  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>
}

function nonEmptyText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function validateActivity(value: unknown): ItineraryActivity | null {
  if (!value || typeof value !== 'object') return null
  const activity = value as Record<string, unknown>
  const time = nonEmptyText(activity.time)
  const name = nonEmptyText(activity.activity)
  const tip = nonEmptyText(activity.tip)

  return time && name ? { time, activity: name, tip } : null
}

function validateItinerary(
  value: Record<string, unknown>,
  city: string,
  requestedDays: number,
): HeritageItinerary {
  if (!Array.isArray(value.days)) {
    throw new Error('The itinerary response did not contain any days.')
  }

  const days = value.days
    .slice(0, requestedDays)
    .map((item, index): ItineraryDay | null => {
      if (!item || typeof item !== 'object') return null
      const day = item as Record<string, unknown>
      const activities = Array.isArray(day.activities)
        ? day.activities.map(validateActivity).filter((activity): activity is ItineraryActivity => Boolean(activity))
        : []
      const title = nonEmptyText(day.title)

      return title && activities.length > 0
        ? { day: index + 1, title, activities }
        : null
    })
    .filter((day): day is ItineraryDay => Boolean(day))

  if (days.length !== requestedDays) {
    throw new Error('The itinerary response was incomplete.')
  }

  return { city, days, source: 'nvidia' }
}

export async function POST(request: Request) {
  let body: ItineraryRequest

  try {
    body = (await request.json()) as ItineraryRequest
  } catch {
    return NextResponse.json({ error: 'A valid JSON body is required.' }, { status: 400 })
  }

  const city = nonEmptyText(body.city)
  const monumentId = nonEmptyText(body.monument_id) || 'taj-mahal'
  const highlights = nonEmptyText(body.city_highlights)
  const language = nonEmptyText(body.lang) || undefined
  const requestedDays = Number(body.days)
  const days = Number.isInteger(requestedDays)
    ? Math.min(5, Math.max(1, requestedDays))
    : 3

  if (!city || city.length > 100) {
    return NextResponse.json(
      { error: 'Choose a valid city before generating an itinerary.' },
      { status: 400 },
    )
  }

  const prompt = `Create a practical ${days}-day heritage itinerary for ${city}, India.
Prioritize these highlights when relevant: ${highlights || 'major heritage attractions'}.
Return only one JSON object in this exact shape:
{"days":[{"day":1,"title":"short day title","activities":[{"time":"8:00 AM","activity":"specific activity","tip":"short practical tip"}]}]}
Include exactly ${days} day objects and exactly 4 chronological activities per day.
Use established attractions and avoid inventing opening hours, ticket prices, hotels, or travel guarantees.`

  try {
    const answer = await askNvidia(prompt, monumentId, language, { maxTokens: 2_400 })
    return NextResponse.json(validateItinerary(parseJsonObject(answer), city, days))
  } catch (error) {
    console.warn(
      '[NVIDIA itinerary fallback]',
      error instanceof Error ? error.message : 'Unknown itinerary error',
    )
    return NextResponse.json(generateLocalItinerary(city, highlights, days))
  }
}
