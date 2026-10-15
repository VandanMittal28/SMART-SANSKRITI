/**
 * Delivers a corroborated Heritage Watch detection into the monument
 * operations console, reusing the same local-demo transport as the manual
 * report screen (`app/report/page.tsx`): the Android bridge inside the APK,
 * a direct call to the local console otherwise.
 *
 * An automated detection is a machine guess, not an eyewitness account, so it
 * is submitted with `origin: 'automated'`. The console keeps those in the
 * review queue instead of dispatching staff on them.
 */

import { isBundledNativeApp } from '@/lib/supabase/client'
import { operationsBaseUrl } from '@/lib/nativePlatform'
import { HERITAGE_WATCH_BY_ID } from './taxonomy.ts'
import type { RaisedIncident } from './corroboration.ts'

type BridgeWindow = typeof window & {
  SanskritiAndroid?: { demoReportRequest?: (method: string, path: string, body: string) => string }
}

async function operationsRequest(method: 'GET' | 'POST', path: string, body?: unknown) {
  const bridge = (window as BridgeWindow).SanskritiAndroid
  if (isBundledNativeApp() && bridge?.demoReportRequest) {
    const result = JSON.parse(
      bridge.demoReportRequest(method, path, body ? JSON.stringify(body) : ''),
    )
    if (!result.ok) throw new Error(result.body?.error || result.error || 'Local MMS unavailable')
    return result.body
  }

  const response = await fetch(`${operationsBaseUrl()}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Request failed')
  return result
}

/**
 * The operations demo site models four generic zones. Explore's waypoints are
 * monument-specific, so we map onto the closest operational area and keep the
 * real waypoint name in the note, where a reviewer can read it.
 */
const ZONE_KEYWORDS: Array<[RegExp, string]> = [
  [/gate|entrance|forecourt|jilaukhana|darwaza/i, 'entrance'],
  [/garden|bagh|pool|tank|terrace|river|embankment/i, 'garden'],
  [/gallery|chamber|dome|cenotaph|inlay|calligraphy|mosque|jawab/i, 'gallery'],
  [/court|plinth|minaret|quarter|ruins/i, 'courtyard'],
]

export function mapToOperationsZone(waypointName: string): string {
  for (const [pattern, zoneId] of ZONE_KEYWORDS) {
    if (pattern.test(waypointName)) return zoneId
  }
  return 'courtyard'
}

function randomToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export interface SubmissionContext {
  monumentName: string
  waypointName: string
  point: { latitude: number; longitude: number; accuracy?: number } | null
  /** Raw base64 JPEG of the frame that triggered corroboration. */
  keyframeBase64: string | null
}

export interface SubmissionReceipt {
  id: string
  token: string
  status: string
  category: string
  submittedAt: number
}

export async function submitDetection(
  incident: RaisedIncident,
  context: SubmissionContext,
): Promise<SubmissionReceipt> {
  const definition = HERITAGE_WATCH_BY_ID[incident.category]
  const id = crypto.randomUUID()
  const token = randomToken()

  const observationLines = incident.observations
    .map((entry, index) => `  ${index + 1}. ${entry.rationale} (confidence ${entry.confidence.toFixed(2)})`)
    .join('\n')

  const note = [
    `Automated camera detection — needs human confirmation.`,
    ``,
    `Possible activity: ${definition.label}`,
    `Location: ${context.monumentName} — ${context.waypointName}`,
    `Corroborating observations: ${incident.observations.length}`,
    `Mean confidence: ${incident.confidence.toFixed(2)}`,
    ``,
    `What the model described:`,
    observationLines,
    ``,
    `This was produced by on-device motion detection followed by an NVIDIA`,
    `vision model. It is not proof and identifies no one. Please verify on`,
    `site before taking any action.`,
  ].join('\n').slice(0, 1200)

  const payload = {
    id,
    token,
    origin: 'automated',
    category: definition.reportCategory,
    note,
    zoneId: mapToOperationsZone(context.waypointName),
    point: context.point,
    photo: context.keyframeBase64 ? `data:image/jpeg;base64,${context.keyframeBase64}` : null,
  }

  const result = await operationsRequest('POST', '/api/demo/reports', payload)
  return {
    id,
    token,
    status: String(result?.status ?? 'review'),
    category: definition.label,
    submittedAt: incident.raisedAt,
  }
}
