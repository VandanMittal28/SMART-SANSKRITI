/**
 * Where the packaged apps reach Sanskriti's own server.
 *
 * Provider credentials are not in the APK or the iOS bundle (see
 * `apk/app/build.gradle`, which ships an empty NVIDIA_API_KEY on purpose), so
 * every model call and every visitor report goes to this host instead.
 *
 * One definition because three copies is how a base URL drifts: the AI
 * transport, the manual report screen and Heritage Watch all file to the same
 * deployment, and a report that silently goes somewhere else is worse than one
 * that fails.
 */
export const VISITOR_API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://smart-sanskriti.vercel.app')
  .replace(/\/$/, '')

/** The four monuments that have a staffed operations team behind them. */
export const MMS_SITE_IDS = ['taj-mahal', 'qutub-minar', 'red-fort', 'konark'] as const
export type MmsSiteId = (typeof MMS_SITE_IDS)[number]

export function isMmsSite(monumentId: string): monumentId is MmsSiteId {
  return (MMS_SITE_IDS as readonly string[]).includes(monumentId)
}

export interface ReportZone {
  id: string
  site_id: string
  zone_key: string
  name: string
}

export interface ReportSite {
  id: string
  name: string
  city: string
  state: string
}

export interface ReportCatalog {
  sites: ReportSite[]
  zones: ReportZone[]
}

export async function visitorApiRequest<T>(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${VISITOR_API_BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const result = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) throw new Error(result.error || `Report service returned ${response.status}.`)
  return result
}
