/**
 * Which native shell, if any, is hosting the bundled visitor UI.
 *
 * Android serves the export from `https://appassets.androidplatform.net/` and
 * is recognised by that host. iOS serves it from a loopback HTTP origin, whose
 * host is a port-dependent `127.0.0.1`, so its shell declares itself instead by
 * setting `window.SanskritiNativePlatform` before any page script runs.
 *
 * Both shells inject the same `window.SanskritiAndroid` bridge, so feature code
 * should ask about capability (is the bridge method there?) rather than about
 * the platform. Use `getNativePlatform` only where the two genuinely differ.
 */

export type NativePlatform = 'android' | 'ios'

const ANDROID_BUNDLE_HOST = 'appassets.androidplatform.net'

export function getNativePlatform(): NativePlatform | null {
  if (typeof window === 'undefined') return null
  if (window.location.hostname === ANDROID_BUNDLE_HOST) return 'android'
  const declared = (window as typeof window & { SanskritiNativePlatform?: string })
    .SanskritiNativePlatform
  return declared === 'ios' ? 'ios' : null
}

/** True inside either packaged app, false in a browser. */
export function isBundledNativeApp(): boolean {
  return getNativePlatform() !== null
}

/**
 * Where the local monument operations console lives, as seen from the page.
 *
 * The iOS shell proxies `/api/demo/*` through the server that already hosts the
 * UI, so a relative path stays same-origin and avoids the console's
 * cross-origin rejection. Android reaches it directly (and normally through the
 * native `demoReportRequest` bridge method instead).
 */
export function operationsBaseUrl(): string {
  if (getNativePlatform() === 'ios') return ''
  return isBundledNativeApp() ? 'http://127.0.0.1:3100' : ''
}

/**
 * Whether sign-in should use on-device profiles instead of Supabase.
 *
 * True in either packaged app, where a visitor at a monument may have no
 * usable connection, and also on a local web development origin, so `npm run
 * dev` keeps working without a reachable Supabase project.
 *
 * Kept separate from `isBundledNativeApp` deliberately: that one answers "am I
 * inside a packaged shell", which also decides things like hard navigation and
 * bridge availability, and a browser on localhost is not a packaged shell.
 */
export function usesLocalProfiles(): boolean {
  if (isBundledNativeApp()) return true
  if (typeof window === 'undefined') return false
  const { hostname } = window.location
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}
