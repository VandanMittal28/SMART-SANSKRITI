'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isBundledAndroidApp, isSupabaseAuthReachable, supabase } from '@/lib/supabase/client'
import {
  getUserProfile,
  normalizeUsername,
  signIn as signInWithUsername,
  signOut as signOutFromSupabase,
} from '@/lib/authClient'
import type { LocalProfile, LocalUser } from '@/lib/localProfile'
import {
  clearLocalSession,
  createLocalSession,
  isLocalUserId,
  listLocalSessions,
  readLocalSession,
  type StoredLocalSession,
  updateLocalProfile,
} from '@/lib/localSession'

interface AuthContextType {
  user: LocalUser | null
  profile: LocalProfile | null
  loading: boolean
  error: string | null
  availableProfiles: StoredLocalSession[]
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
  availableProfiles: [],
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
  const [availableProfiles, setAvailableProfiles] = useState<StoredLocalSession[]>([])

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
      try {
        if (isBundledAndroidApp()) {
          const localSession = readLocalSession()
          const savedProfiles = listLocalSessions()
          if (!active) return
          setUser(localSession?.user ?? null)
          setProfileState(localSession?.profile ?? null)
          setAvailableProfiles(savedProfiles)
          setError(null)
          setLoading(false)
          return
        }

        // The APK keeps the Supabase token in WebView local storage. Restore
        // that token directly on launch; a short timeout still prevents an
        // unavailable network from trapping the app on its loading screen.
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
    if (isLocalUserId(user.id)) {
      const localSession = readLocalSession()
      if (localSession?.user.id === user.id) {
        setUser(localSession.user)
        setProfileState(localSession.profile)
      }
      return
    }
    const nextProfile = await getUserProfile(user.id)
    setProfileState(nextProfile)
    setUser((current) => current && current.username !== nextProfile.username
      ? { ...current, username: nextProfile.username }
      : current)
  }, [user])

  useEffect(() => {
    if (!user || isLocalUserId(user.id)) return

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
    setProfileState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      if (next && user && isLocalUserId(user.id)) {
        try {
          updateLocalProfile(user.id, next)
          setAvailableProfiles(listLocalSessions())
        } catch {
          // Keep the in-memory profile usable if WebView storage is unavailable.
        }
      }
      return next
    })
  }, [user])

  const signIn = useCallback(async (username: string) => {
    if (isBundledAndroidApp()) {
      const normalized = normalizeUsername(username)
      if (!/^[a-z0-9_]{3,24}$/.test(normalized)) {
        throw new Error('Use 3–24 letters, numbers, or underscores for your username.')
      }
      const localSession = createLocalSession(normalized)
      setUser(localSession.user)
      setProfileState(localSession.profile)
      setAvailableProfiles(listLocalSessions())
      setError(null)
      setLoading(false)
      return { user: localSession.user }
    }
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
    if (user && isLocalUserId(user.id)) {
      clearLocalSession()
      setUser(null)
      setProfileState(null)
      setAvailableProfiles(listLocalSessions())
      setError(null)
      return
    }
    await signOutFromSupabase()
    setUser(null)
    setProfileState(null)
  }, [user])

  const signUp = useCallback(async (_email: string, _password: string, fullName: string) => {
    return signIn(fullName)
  }, [signIn])

  const value = useMemo(() => ({
    user,
    profile,
    availableProfiles,
    loading,
    error,
    setProfile,
    refreshProfile,
    signIn,
    signOut,
    signUp,
  }), [availableProfiles, error, loading, profile, refreshProfile, setProfile, signIn, signOut, signUp, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
