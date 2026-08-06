'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
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

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      const authUser = data.session?.user
      if (!authUser) {
        setUser(null)
        setProfileState(null)
        setLoading(false)
        return
      }

      try {
        await loadAuthenticatedUser(
          authUser.id,
          authUser.email || '',
          authUser.is_anonymous === true,
        )
      } catch {
        setUser(null)
        setProfileState(null)
      } finally {
        if (active) setLoading(false)
      }
    })

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => {
        if (!active) return
        const authUser = nextSession?.user
        if (!authUser) {
          setUser(null)
          setProfileState(null)
          setLoading(false)
          return
        }

        void loadAuthenticatedUser(
          authUser.id,
          authUser.email || '',
          authUser.is_anonymous === true,
        ).finally(() => {
          if (active) setLoading(false)
        })
      }, 0)
    })

    return () => {
      active = false
      authSubscription.subscription.unsubscribe()
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
    setProfile,
    refreshProfile,
    signIn,
    signOut,
    signUp,
  }), [loading, profile, refreshProfile, setProfile, signIn, signOut, signUp, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
