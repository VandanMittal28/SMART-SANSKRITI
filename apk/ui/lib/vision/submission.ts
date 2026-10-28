/**
 * Delivers a corroborated Heritage Watch detection to the monument operations
 * team, through the same hosted API the manual report screen uses.
 *
 * This used to post to the operations sandbox on `127.0.0.1:3100`. On a
 * developer's laptop that is the console; on a visitor's phone it is the
 * phone, where nothing is listening, so every detection was lost. It now
 * files a real MMS incident in Supabase.
 *
 * An automated detection is a machine guess, not an eyewitness account, so it
 * is submitted with `origin: 'automated'`. The database files those as a
 * 'Camera alert', captions them as unconfirmed, caps their priority, and still
 * requires a human to confirm before anyone is dispatched.
 *
 * Only the four staffed MMS sites can receive one. Everywhere else there is no
 * team to receive it, and this says so rather than appearing to report.
 */

import { HERITAGE_WATCH_BY_ID } from './taxonomy.ts'
import { isMmsSite, visitorApiRequest, type ReportCatalog, type ReportZone } from '../visitorApi.ts'
import type { RaisedIncident } from './corroboration.ts'

/** Thrown when the monument has no operations team, so nothing can be filed. */
export class NoOperationsTeamError extends Error {}

/**
 * Explore's waypoints are richer than the operational zone list, so the
 * closest zone is chosen by name and the real waypoint is kept in the note
 * where a reviewer reads it.
 *
 * Scoring on shared words rather than a keyword table: the zone names come
 * from the database and differ per site, so a hardcoded mapping would silently
 * rot the moment a site edits its zones.
 */
const STOP_WORDS = new Set(['the', 'of', 'and', 'at', 'in', 'a'])

function words(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word))
}

/**
 * Two words count as the same place-word if they share a stem, or if one
 * contains the other and the shorter is substantial. Zone names are written by
 * site staff and waypoints by the guide author, so they agree on the place and
 * disagree on the wording: "Charbagh Gardens" against "Moonlight Garden
 * (Mahtab Bagh)" is a match on both counts, and an exact-token comparison
 * misses it entirely.
 */
function stem(word: string): string {
  return word.endsWith('s') ? word.slice(0, -1) : word
}

function related(a: string, b: string): boolean {
  if (stem(a) === stem(b)) return true
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  return short.length >= 4 && long.includes(short)
}

export function chooseZone(waypointName: string, zones: ReportZone[]): ReportZone | null {
  if (zones.length === 0) return null
  const target = words(waypointName)
  let best: ReportZone | null = null
  let bestScore = 0
  for (const zone of zones) {
    const score = words(zone.name).filter(word => target.some(other => related(word, other))).length
    if (score > bestScore) {
      bestScore = score
      best = zone
    }
  }
  // No shared word is not a match; the first active zone is a better guess
  // than a coincidence, and the note still carries the real waypoint.
  return best ?? zones[0]
}

function randomToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export interface SubmissionContext {
  /** Explore's monument id; must be an MMS site for a report to be filed. */
  monumentId: string
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

  if (!isMmsSite(context.monumentId)) {
    throw new NoOperationsTeamError(
      `${context.monumentName} has no monument operations team connected, so this was not filed.`,
    )
  }

  const catalog = await visitorApiRequest<ReportCatalog>('/api/reports')
  const siteZones = catalog.zones.filter(zone => zone.site_id === context.monumentId)
  const zone = chooseZone(context.waypointName, siteZones)
  if (!zone) {
    throw new NoOperationsTeamError('This site has no active areas to report against.')
  }

  const payload = {
    id,
    token,
    origin: 'automated',
    siteId: context.monumentId,
    category: definition.reportCategory,
    note,
    zoneId: zone.zone_key,
    point: context.point,
    photo: context.keyframeBase64 ? `data:image/jpeg;base64,${context.keyframeBase64}` : null,
  }

  const result = await visitorApiRequest<{ id?: string; status?: string }>('/api/reports', 'POST', payload)
  return {
    id,
    token,
    status: String(result?.status ?? 'reported'),
    category: definition.label,
    submittedAt: incident.raisedAt,
  }
}
