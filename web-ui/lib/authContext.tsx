'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isBundledAndroidApp, isSupabaseAuthReachable, supabase } from '@/lib/supabase/client'
import {
  getUserProfile,
  signIn as signInWithUsername,
  signOut as signOutFromSupabase,
} from '@/lib/authClient'
import type { LocalProfile, LocalUser } from '@/lib/localProfile'

interface AuthContextType {
  user: LocalUser | null
  profile: LocalProfile | null
  loading: boolean
  error: string | null
  setProfile: (updater: LocalProfile | ((prev: LocalProfile | null) => LocalProfile | null)) => void
  refreshProfile: () => Promise<void>
  signIn: (username: string) => Promise<{ user: LocalUser }>
  signOut: () => Promise<void>
  signUp: (_email: string, _password: string, fullName: string, _phone?: string) => Promise<{ user: LocalUser }>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  setProfile: () => {},
  refreshProfile: async () => {},
  signIn: async () => { throw new Error('AuthProvider is unavailable.') },
  signOut: async () => {},
  signUp: async () => { throw new Error('AuthProvider is unavailable.') },
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null)
  const [profile, setProfileState] = useState<LocalProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAuthenticatedUser = useCallback(async (
    userId: string,
    email = '',
    isAnonymous = false,
  ) => {
    const nextProfile = await getUserProfile(userId)
    const nextUser: LocalUser = {
      id: userId,
      username: nextProfile.username,
      email,
      isAnonymous,
    }
    setUser(nextUser)
    setProfileState(nextProfile)
    return nextUser
  }, [])

  useEffect(() => {
    let active = true
    let unsubscribeAuth: (() => void) | undefined

    const clearAuthenticatedUser = (message: string | null = null) => {
      if (!active) return
      setUser(null)
      setProfileState(null)
      setError(message)
      setLoading(false)
    }

    const initializeAuth = async () => {
      // The installed demo must open immediately even when the phone is
      // offline. Sign-in still talks directly to Supabase when the user asks
      // for it; only the optional persisted-session restore is skipped.
      if (isBundledAndroidApp()) {
        clearAuthenticatedUser()
        return
      }

      try {
        const reachable = await isSupabaseAuthReachable()
        if (!active) return
        if (!reachable) {
          clearAuthenticatedUser('Cloud profiles are temporarily unavailable. Please try again shortly.')
          return
        }

        // Some Android System WebView versions can leave the Supabase session
        // bootstrap pending even though the network is reachable. Never let
        // that keep the entire standalone app behind its loading screen.
        const sessionTimeout = new Promise<never>((_resolve, reject) => {
          window.setTimeout(() => reject(new Error('Session check timed out.')), 4_000)
        })
        const { data, error: sessionError } = await Promise.race([
          supabase.auth.getSession(),
          sessionTimeout,
        ])
        if (sessionError) throw sessionError
        if (!active) return

        const authUser = data.session?.user
        if (authUser) {
          await loadAuthenticatedUser(
            authUser.id,
            authUser.email || '',
            authUser.is_anonymous === true,
          )
        } else {
          setUser(null)
          setProfileState(null)
        }
        if (!active) return
        setError(null)
        setLoading(false)

        const { data: authSubscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
          // The current session was handled above. Subsequent events are
          // deferred so the callback never calls Supabase while its lock is held.
          if (event === 'INITIAL_SESSION') return
          window.setTimeout(() => {
            if (!active) return
            const nextAuthUser = nextSession?.user
            if (!nextAuthUser) {
              clearAuthenticatedUser()
              return
            }

            void loadAuthenticatedUser(
              nextAuthUser.id,
              nextAuthUser.email || '',
              nextAuthUser.is_anonymous === true,
            ).then(() => {
              if (active) setError(null)
            }).catch(() => {
              clearAuthenticatedUser('Your profile could not be loaded. Please try again.')
            }).finally(() => {
              if (active) setLoading(false)
            })
          }, 0)
        })
        unsubscribeAuth = () => authSubscription.subscription.unsubscribe()
      } catch {
        clearAuthenticatedUser('Cloud profiles are temporarily unavailable. Please try again shortly.')
      }
    }

    void initializeAuth()

    return () => {
      active = false
      unsubscribeAuth?.()
    }
  }, [loadAuthenticatedUser])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const nextProfile = await getUserProfile(user.id)
    setProfileState(nextProfile)
    setUser((current) => current && current.username !== nextProfile.username
      ? { ...current, username: nextProfile.username }
      : current)
  }, [user])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`sanskriti-profile-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => { void refreshProfile() },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [refreshProfile, user])

  const setProfile = useCallback((updater: LocalProfile | ((prev: LocalProfile | null) => LocalProfile | null)) => {
    setProfileState((current) => typeof updater === 'function' ? updater(current) : updater)
  }, [])

  const signIn = useCallback(async (username: string) => {
    if (!(await isSupabaseAuthReachable())) {
      const message = 'Cloud profiles are temporarily unavailable. Please try again shortly.'
      setError(message)
      throw new Error(message)
    }
    setError(null)
    const result = await signInWithUsername(username)
    const nextUser = await loadAuthenticatedUser(
      result.user.id,
      result.user.email,
      result.user.isAnonymous,
    )
    setLoading(false)
    return { user: nextUser }
  }, [loadAuthenticatedUser])

  const signOut = useCallback(async () => {
    await signOutFromSupabase()
    setUser(null)
    setProfileState(null)
  }, [])

  const signUp = useCallback(async (_email: string, _password: string, fullName: string) => {
    return signIn(fullName)
  }, [signIn])

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    error,
    setProfile,
    refreshProfile,
    signIn,
    signOut,
    signUp,
  }), [error, loading, profile, refreshProfile, setProfile, signIn, signOut, signUp, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
