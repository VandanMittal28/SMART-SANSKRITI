import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function isBundledAndroidApp() {
  return typeof window !== 'undefined'
    && window.location.hostname === 'appassets.androidplatform.net'
}

function createSanskritiClient() {
  const bundledAndroidApp = isBundledAndroidApp()
  const directAppLock = async <Result>(
    _name: string,
    _acquireTimeout: number,
    operation: () => Promise<Result>,
  ): Promise<Result> => operation()

  const auth = {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !bundledAndroidApp,
    storageKey: 'sanskriti-ai-auth',
    ...(bundledAndroidApp ? { lock: directAppLock } : {}),
  } as NonNullable<NonNullable<Parameters<typeof createClient>[2]>['auth']>

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth,
  })
}

type SanskritiSupabaseClient = ReturnType<typeof createSanskritiClient>

const globalForSupabase = globalThis as typeof globalThis & {
  __sanskritiSupabase?: SanskritiSupabaseClient
}

export const supabase = globalForSupabase.__sanskritiSupabase ?? createSanskritiClient()

// Fast Refresh can evaluate this module more than once. Reusing the client
// avoids competing GoTrue instances acquiring the same browser session lock.
if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.__sanskritiSupabase = supabase
}

export async function isSupabaseAuthReachable(timeoutMs = 5_000): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    })
    return response.ok
  } catch {
    return false
  }
}
