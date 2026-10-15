/**
 * Tier 2 of Heritage Watch: the single definition of what the vision model is
 * asked and how its answer is validated.
 *
 * Shared by the in-APK native bridge path and the browser `/api/heritage-watch`
 * path so the two can never drift. Pure — no network, no DOM.
 */

import {
  HERITAGE_WATCH_DEFINITIONS,
  NO_FINDING,
  isHeritageWatchCategory,
  type HeritageWatchVerdict,
} from './taxonomy.ts'

export interface SceneAssessment {
  verdict: HeritageWatchVerdict
  confidence: number
  rationale: string
  /**
   * False when the reply could not be read at all, as opposed to the model
   * deliberately answering "none". Both are safe — neither can raise an
   * incident — but only one means the pipeline is healthy, and collapsing
   * them makes a dead model indistinguishable from a quiet monument.
   */
  understood: boolean
}

/**
 * Built from the taxonomy so adding a category cannot leave the prompt stale.
 *
 * Three rules do the heavy lifting:
 *  - `none` is stated as the expected answer, because it almost always is.
 *    Without that, a model asked "which of these six is happening" will pick
 *    one.
 *  - Appearance, identity, dress, religion and companionship are ruled out
 *    explicitly, matching the manual-report convention in
 *    `apps/operations/lib/nvidia-assessment.ts`.
 *  - The model is told its output triggers a human inspection, not a penalty,
 *    which is literally true here and discourages hedged over-reporting.
 */
export function buildScenePrompt(): string {
  const categories = HERITAGE_WATCH_DEFINITIONS.map(
    definition => `- "${definition.id}": ${definition.prompt}`,
  ).join('\n')

  return `You are reviewing one still frame from a visitor's phone camera inside a heritage monument.

Decide whether the frame shows one of these specific acts in progress:
${categories}

Rules:
- "${NO_FINDING}" is the correct answer for almost every frame. Ordinary visiting — walking, standing, queuing, talking, photographing, pointing, sitting on seating, embracing, holding hands, praying, eating in permitted areas — is "${NO_FINDING}".
- Report only what a person is visibly DOING to the site. Never infer from a person's appearance, clothing, age, gender, religion, who they are with, or how close they stand.
- Do not identify or describe any individual. Do not guess at identity or intent.
- If the frame is blurred, dark, obstructed, too distant, or ambiguous, answer "${NO_FINDING}".
- Your answer sends a staff member to look. It is not proof and imposes no penalty. Do not state that an offence occurred.

You may be given a second, closer image: a crop of the part of the view that is
actually moving. Use it for detail, but judge the scene as a whole.

You may also be given a one-line description of how that region has moved over
the last few seconds, measured on the device. Movement is strong evidence of
which act this is: marking a surface stays in one place, a passer-by moves
steadily across, a struggle reverses direction repeatedly. If the movement
contradicts what the image seems to show, prefer "${NO_FINDING}".

Return only valid JSON, no markdown:
{"verdict":"<one id above or ${NO_FINDING}>","confidence":<0.0-1.0>,"rationale":"<one short neutral sentence describing only the visible action>"}`
}

/** Parses and hard-validates a model reply. Anything odd degrades to `none`. */
export function parseSceneAssessment(raw: string): SceneAssessment {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) return safeNone('The model reply was not JSON.')

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    return safeNone('The model reply could not be parsed.')
  }

  const verdict = parsed.verdict
  const reportable = isHeritageWatchCategory(verdict)
  if (!reportable && verdict !== NO_FINDING) {
    return safeNone(`The model returned an unknown verdict: ${String(verdict).slice(0, 40)}`)
  }

  const confidence = Number(parsed.confidence)
  // An unparseable confidence must not become a high one.
  if (!Number.isFinite(confidence)) return safeNone('The model gave no usable confidence.')

  const rationale = typeof parsed.rationale === 'string' ? parsed.rationale.trim() : ''

  return {
    verdict: reportable ? verdict : NO_FINDING,
    confidence: Math.min(1, Math.max(0, confidence > 1 ? confidence / 100 : confidence)),
    rationale: (rationale || 'No description provided.').slice(0, 300),
    understood: true,
  }
}

function safeNone(rationale: string): SceneAssessment {
  return { verdict: NO_FINDING, confidence: 0, rationale, understood: false }
}

export interface SceneRequestInput {
  /** Full downscaled keyframe. */
  imageBase64: string
  /** Optional closer crop of the moving region. */
  regionBase64?: string | null
  /** Optional one-line description of how that region has been moving. */
  motionContext?: string | null
}

/** Request body shared by the native bridge and the server route. */
export function buildSceneRequestBody(input: SceneRequestInput | string) {
  const { imageBase64, regionBase64, motionContext } =
    typeof input === 'string' ? { imageBase64: input, regionBase64: null, motionContext: null } : input

  const content: Array<Record<string, unknown>> = [
    { type: 'text', text: buildScenePrompt() },
    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
  ]
  if (regionBase64) {
    content.push({ type: 'text', text: 'Closer crop of the moving region:' })
    content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${regionBase64}` } })
  }
  if (motionContext) {
    content.push({ type: 'text', text: `Measured movement: ${motionContext}` })
  }

  return {
    messages: [{ role: 'user', content }],
    temperature: 0.1,
    max_tokens: 220,
    reasoning_budget: 0,
    chat_template_kwargs: { enable_thinking: false },
    stream: false,
  }
}
