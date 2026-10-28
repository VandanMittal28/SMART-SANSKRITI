/**
 * Transport for Heritage Watch scene assessment.
 *
 * The NVIDIA key is never on the device: inside a packaged app the frame goes
 * to the hosted visitor API, and in a browser it goes to this app's own
 * `/api/heritage-watch`. Both run the prompt from `./prompt.ts`, so the two
 * paths cannot ask different questions. Callers should not care which.
 */

import { assessHeritageSceneNative, hasNativeNvidia } from '@/lib/nativeNvidia'
import { NO_FINDING } from './taxonomy.ts'
import type { SceneAssessment, SceneRequestInput } from './prompt.ts'

export type { SceneAssessment }

/** A frame we could not assess must never look like a clean frame. */
export class SceneAssessmentError extends Error {}

export async function assessScene(
  input: SceneRequestInput | string,
  signal?: AbortSignal,
): Promise<SceneAssessment> {
  const request: SceneRequestInput = typeof input === 'string' ? { imageBase64: input } : input
  if (hasNativeNvidia()) return assessHeritageSceneNative(request)

  const response = await fetch('/api/heritage-watch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: request.imageBase64,
      region: request.regionBase64 ?? null,
      motionContext: request.motionContext ?? null,
    }),
    signal,
  })

  const payload = await response.json().catch(() => null) as
    | (SceneAssessment & { error?: string })
    | null

  if (!response.ok || !payload) {
    throw new SceneAssessmentError(visitorMessage(payload?.error))
  }
  if (typeof payload.verdict !== 'string') {
    throw new SceneAssessmentError('Scene assessment returned an unusable result.')
  }

  return {
    verdict: payload.verdict,
    confidence: Number(payload.confidence) || 0,
    rationale: typeof payload.rationale === 'string' ? payload.rationale : '',
    understood: payload.understood === true,
  }
}

/**
 * Server errors are written for operators. A visitor standing in a monument
 * needs to know only whether the feature is working, not which environment
 * variable is missing.
 */
function visitorMessage(serverError: string | undefined): string {
  if (!serverError) return 'Scene assessment is unavailable.'
  if (/API_KEY|not configured/i.test(serverError)) {
    return 'Heritage Watch needs the monument AI service, which is not set up in this build.'
  }
  return serverError
}

export const NO_FINDING_VERDICT = NO_FINDING
