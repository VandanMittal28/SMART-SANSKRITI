import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function createSanskritiClient() {
  const auth = {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sanskriti-ai-auth',
    // AuthProvider initializes after a lightweight reachability check. This
    // prevents an unavailable Auth host from becoming a Next.js runtime error.
    skipAutoInitialize: true,
  } as NonNullable<NonNullable<Parameters<typeof createClient>[2]>['auth']> & {
    skipAutoInitialize: boolean
  }

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
