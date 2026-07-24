const DEFAULT_NVIDIA_MODEL = 'nvidia/nemotron-3-nano-30b-a3b'
const DEFAULT_NVIDIA_VISION_MODEL =
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'
const DEFAULT_NVIDIA_SPEECH_MODEL =
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'
const NVIDIA_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const NVIDIA_STATUS_URL = 'https://integrate.api.nvidia.com/v1/status'

interface NvidiaResponse {
  choices?: Array<{
    message?: {
      content?: string
      reasoning_content?: string
    }
  }>
  error?: {
    message?: string
  }
  detail?: string
  requestId?: string
}

const MONUMENT_NAMES: Record<string, string> = {
  'taj-mahal': 'Taj Mahal',
  'red-fort': 'Red Fort',
  'qutub-minar': 'Qutub Minar',
  'gateway-india': 'Gateway of India',
  hampi: 'Hampi',
  'golden-temple': 'Golden Temple',
  kedarnath: 'Kedarnath Temple',
  meenakshi: 'Meenakshi Amman Temple',
  'mysore-palace': 'Mysore Palace',
  'hawa-mahal': 'Hawa Mahal',
  charminar: 'Charminar',
  'victoria-memorial': 'Victoria Memorial',
  ajanta: 'Ajanta Caves',
  konark: 'Konark Sun Temple',
  'india-gate': 'India Gate',
}

function buildSystemPrompt(monumentId: string, language?: string) {
  const monumentName = MONUMENT_NAMES[monumentId] || monumentId || 'Indian heritage'
  const languageInstruction =
    language === 'hi'
      ? 'Answer in natural Hindi.'
      : language === 'en'
        ? 'Answer in clear English.'
        : 'Answer in the same language as the visitor.'

  return [
    'You are Sharda, a warm and accurate guide to Indian history, culture, and heritage.',
    `The visitor is currently exploring ${monumentName}.`,
    languageInstruction,
    'Give a concise, engaging answer suitable for a visitor or student.',
    'Prefer well-established historical facts. Clearly label legends or disputed claims, and say when you are uncertain.',
    'Do not invent dates, names, prices, opening hours, or other factual details.',
  ].join(' ')
}

function removeHiddenReasoning(content: string) {
  const lastThinkTag = content.lastIndexOf('</think>')
  return (lastThinkTag >= 0 ? content.slice(lastThinkTag + 8) : content).trim()
}

function getApiKey() {
  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) throw new Error('NVIDIA_API_KEY is not configured')
  return apiKey
}

function getNvidiaError(data: NvidiaResponse, status: number) {
  return (
    data.error?.message ||
    data.detail ||
    `NVIDIA request failed with status ${status}`
  )
}

async function pollNvidiaResult(requestId: string, apiKey: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1_000))

    const response = await fetch(`${NVIDIA_STATUS_URL}/${requestId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(45_000),
    })
    const data = (await response.json()) as NvidiaResponse

    if (response.status === 202) continue
    if (!response.ok) throw new Error(getNvidiaError(data, response.status))

    return data
  }

  throw new Error('NVIDIA request timed out while processing')
}

async function requestNvidia(body: Record<string, unknown>): Promise<NvidiaResponse> {
  const apiKey = getApiKey()
  const response = await fetch(NVIDIA_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })
  const data = (await response.json()) as NvidiaResponse

  if (response.status === 202 && data.requestId) {
    return pollNvidiaResult(data.requestId, apiKey)
  }

  if (!response.ok) {
    throw new Error(getNvidiaError(data, response.status))
  }

  return data
}

function getAnswer(data: NvidiaResponse) {
  const answer = removeHiddenReasoning(data.choices?.[0]?.message?.content || '')
  if (!answer) throw new Error('NVIDIA returned an empty response')
  return answer
}

export async function askNvidia(
  question: string,
  monumentId = '',
  language?: string,
  options?: { maxTokens?: number },
): Promise<string> {
  const model = process.env.NVIDIA_MODEL || DEFAULT_NVIDIA_MODEL

  const data = await requestNvidia({
    model,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(monumentId, language),
      },
      {
        role: 'user',
        content: question,
      },
    ],
    temperature: 0.25,
    max_tokens: options?.maxTokens ?? 800,
    reasoning_budget: 0,
    chat_template_kwargs: { enable_thinking: false },
    stream: false,
  })

  return getAnswer(data)
}

export interface MonumentRecognition {
  monument_name: string
  monument_id: string
  location: string
  category: string
  era_or_dynasty: string
  architecture_style: string
  religion: string
  confidence_score: number
  key_identifiers: string[]
  brief_description: string
  reasoning: string
  is_unknown: boolean
}

const RECOGNITION_PROMPT = `Identify the main Indian monument in this image.
Return only one valid JSON object with these exact keys:
{
  "monument_name": "exact name or Unknown",
  "monument_id": "lowercase-kebab-case or unknown",
  "location": "city, state",
  "category": "monument category",
  "era_or_dynasty": "era or dynasty",
  "architecture_style": "architectural style",
  "religion": "religious association or Secular",
  "confidence_score": 0,
  "key_identifiers": ["visible feature 1", "visible feature 2"],
  "brief_description": "one concise factual sentence",
  "reasoning": "one concise sentence describing visible evidence",
  "is_unknown": false
}
confidence_score must be an integer from 0 to 100. Do not identify from weak
resemblance alone. If the image is a collage, unclear, not a monument, or no
single monument is dominant, return Unknown with is_unknown true.`

function parseJsonObject(content: string): Record<string, unknown> {
  const cleaned = removeHiddenReasoning(content)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')

  if (start < 0 || end <= start) {
    throw new Error('NVIDIA vision model did not return JSON')
  }

  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

export async function recognizeMonument(
  imageBase64: string,
): Promise<MonumentRecognition> {
  const model = process.env.NVIDIA_VISION_MODEL || DEFAULT_NVIDIA_VISION_MODEL
  const data = await requestNvidia({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: RECOGNITION_PROMPT },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 1_200,
    chat_template_kwargs: { enable_thinking: false },
    stream: false,
  })

  const raw = parseJsonObject(getAnswer(data))
  const confidence = Number(raw.confidence_score)
  const monumentName = text(raw.monument_name, 'Unknown')
  const isUnknown =
    raw.is_unknown === true || monumentName.toLowerCase() === 'unknown'

  return {
    monument_name: isUnknown ? 'Unknown' : monumentName,
    monument_id: text(raw.monument_id, 'unknown'),
    location: text(raw.location, 'Location unavailable'),
    category: text(raw.category),
    era_or_dynasty: text(raw.era_or_dynasty),
    architecture_style: text(raw.architecture_style),
    religion: text(raw.religion),
    confidence_score: Number.isFinite(confidence)
      ? Math.min(100, Math.max(0, Math.round(confidence)))
      : 0,
    key_identifiers: Array.isArray(raw.key_identifiers)
      ? raw.key_identifiers.map(String).slice(0, 6)
      : [],
    brief_description: text(raw.brief_description),
    reasoning: text(raw.reasoning),
    is_unknown: isUnknown,
  }
}

export async function transcribeAudio(
  audioBase64: string,
  language: 'en' | 'hi' = 'en',
): Promise<string> {
  const model = process.env.NVIDIA_SPEECH_MODEL || DEFAULT_NVIDIA_SPEECH_MODEL
  const languageName = language === 'hi' ? 'Hindi' : 'English'
  const data = await requestNvidia({
    model,
    messages: [
      {
        role: 'system',
        content: '/no_think',
      },
      {
        role: 'user',
        content: [
          {
            type: 'audio_url',
            audio_url: { url: `data:audio/wav;base64,${audioBase64}` },
          },
          {
            type: 'text',
            text:
              language === 'hi'
                ? 'This recording is Hindi. Transcribe the exact spoken Hindi words in Devanagari script. Do not translate and do not use Roman letters. Return only the transcript.'
                : `Transcribe this ${languageName} speech exactly. Return only the transcript with no commentary or quotation marks.`,
          },
        ],
      },
    ],
    temperature: 0.2,
    top_k: 1,
    max_tokens: 512,
    reasoning_budget: 0,
    chat_template_kwargs: { enable_thinking: false },
    stream: false,
  })

  return getAnswer(data).replace(/^["']|["']$/g, '').trim()
}
