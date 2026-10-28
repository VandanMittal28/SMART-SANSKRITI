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

import { HERITAGE_WATCH_BY_ID } from './taxonomy.ts'
import type { RaisedIncident } from './corroboration.ts'

async function operationsRequest(method: 'GET' | 'POST', path: string, body?: unknown) {
  const response = await fetch(path.replace('/api/demo/reports', '/api/reports'), {
    method, headers: {'Content-Type': 'application/json'},
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Report could not be saved');
  return result;
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

  const siteId = ({'Taj Mahal':'taj-mahal','Qutub Minar':'qutub-minar','Red Fort':'red-fort','Konark Sun Temple':'konark'} as Record<string,string>)[context.monumentName];
  if (!siteId) throw new Error('Reporting is not available at this site. Contact staff nearby.');
  const catalogResponse = await fetch('/api/reports/catalog');
  const catalog = await catalogResponse.json();
  if (!catalogResponse.ok) throw new Error('Reporting locations are unavailable.');
  const zones = (catalog.zones as Array<{site_id:string;zone_key:string;name:string}>).filter(z=>z.site_id===siteId);
  const words = context.waypointName.toLowerCase().split(/[^a-z]+/).filter(w=>w.length>3 && !['main','great','building'].includes(w));
  const zone = zones.find(z=>words.some(w=>z.name.toLowerCase().includes(w)));
  if (!zone) throw new Error('Please use Report to confirm the incident area before sending this observation.');
  const payload = {
    id,
    token,
    origin: 'automated',
    siteId,
    category: definition.reportCategory,
    note,
    zoneId: zone.zone_key,
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
