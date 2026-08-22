'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { YatrikCompanion } from '@/components/yatrik/yatrik-companion'
import { YatrikWelcome } from '@/components/yatrik/yatrik-welcome'
import { useAuth } from '@/lib/authContext'
import { markMascotIntroSeen } from '@/lib/authClient'
import { subscribeToYatrikEvents } from '@/lib/yatrik/events'
import type { YatrikAssetManifest, YatrikEvent, YatrikState } from '@/lib/yatrik/types'

const MUTE_STORAGE_KEY = 'sanskriti-yatrik-muted-v1'
const WELCOME_STORAGE_PREFIX = 'sanskriti-yatrik-welcome-v2:'
const HIDDEN_PATHS = new Set(['/login', '/auth', '/chat'])
const SHOW_WELCOME_OVERLAY = true

type WelcomePhase = 'idle' | 'fly-in' | 'landing' | 'ready' | 'talking' | 'complete'

interface YatrikControls {
  muted: boolean
  toggleMute: () => void
}

const YatrikControlsContext = createContext<YatrikControls | null>(null)

export function useYatrikControls(): YatrikControls {
  const controls = useContext(YatrikControlsContext)
  if (!controls) throw new Error('useYatrikControls must be used inside YatrikProvider.')
  return controls
}

function speak(text: string, muted: boolean): void {
  if (muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.96
  utterance.pitch = 1.05
  window.speechSynthesis.speak(utterance)
}

function hasLocalWelcome(userId: string): boolean {
  try {
    return localStorage.getItem(`${WELCOME_STORAGE_PREFIX}${userId}`) === 'true'
  } catch {
    return false
  }
}

function saveLocalWelcome(userId: string): void {
  try {
    localStorage.setItem(`${WELCOME_STORAGE_PREFIX}${userId}`, 'true')
  } catch {
    // The welcome still completes for the current session.
  }
}

export function YatrikProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const router = useRouter()
  const { profile, setProfile, user } = useAuth()
  const [manifest, setManifest] = useState<YatrikAssetManifest | null>(null)
  const [muted, setMuted] = useState(false)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [welcomePhase, setWelcomePhase] = useState<WelcomePhase>('idle')
  const [welcomeError, setWelcomeError] = useState<string | null>(null)
  const [savingWelcome, setSavingWelcome] = useState(false)
  const [activeEvent, setActiveEvent] = useState<YatrikEvent | null>(null)
  const [queue, setQueue] = useState<YatrikEvent[]>([])
  const activeEventRef = useRef<YatrikEvent | null>(null)

  useEffect(() => {
    fetch('/yatrik/manifest.v1.json')
      .then((response) => {
        if (!response.ok) throw new Error('Yatrik manifest unavailable')
        return response.json() as Promise<YatrikAssetManifest>
      })
      .then(setManifest)
      .catch(() => setManifest(null))

    try {
      setMuted(localStorage.getItem(MUTE_STORAGE_KEY) === 'true')
    } catch {
      setMuted(false)
    }
    setPreferencesLoaded(true)
  }, [])

  useEffect(() => {
    activeEventRef.current = activeEvent
  }, [activeEvent])

  useEffect(() => subscribeToYatrikEvents((event) => {
    const current = activeEventRef.current
    if (!current) {
      activeEventRef.current = event
      setActiveEvent(event)
      return
    }
    if (event.priority >= current.priority) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      activeEventRef.current = event
      setActiveEvent(event)
      return
    }
    setQueue((items) => [...items, event].sort((a, b) => b.priority - a.priority))
  }), [])

  useEffect(() => {
    if (!activeEvent) return
    if (activeEvent.narration !== null) {
      speak(activeEvent.narration ?? activeEvent.caption, muted)
    }
    const timer = window.setTimeout(() => {
      setQueue((items) => {
        const [next, ...remaining] = items
        activeEventRef.current = next ?? null
        setActiveEvent(next ?? null)
        return remaining
      })
    }, activeEvent.durationMs ?? 6500)
    return () => window.clearTimeout(timer)
  }, [activeEvent, muted])

  useEffect(() => {
    if (!preferencesLoaded || !user || !profile || welcomePhase !== 'idle') return
    if (hasLocalWelcome(user.id)) {
      setWelcomePhase('complete')
      return
    }
    setWelcomePhase('fly-in')
  }, [preferencesLoaded, profile, user, welcomePhase])

  useEffect(() => {
    if (welcomePhase !== 'fly-in') return
    const timer = window.setTimeout(() => setWelcomePhase('landing'), 850)
    return () => window.clearTimeout(timer)
  }, [welcomePhase])

  useEffect(() => {
    if (welcomePhase !== 'landing') return
    const timer = window.setTimeout(() => setWelcomePhase('ready'), 700)
    return () => window.clearTimeout(timer)
  }, [welcomePhase])

  useEffect(() => () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, String(next))
      } catch {
        // The preference remains available for the current session.
      }
      if (next && 'speechSynthesis' in window) window.speechSynthesis.cancel()
      return next
    })
  }, [])

  const completeWelcome = useCallback(async () => {
    if (!user || savingWelcome) return
    const greeting = "Hi, I'm Yatrik, your travel buddy."
    setWelcomeError(null)
    setSavingWelcome(true)
    setWelcomePhase('talking')
    speak(greeting, muted)

    let seenAt = new Date().toISOString()
    try {
      seenAt = await markMascotIntroSeen(user.id)
    } catch {
      // The deployed database may not have the optional welcome column yet,
      // or the phone may be offline. Device-local persistence keeps this
      // non-critical introduction from blocking the installed app.
    } finally {
      saveLocalWelcome(user.id)
      setProfile((current) => current ? { ...current, mascot_intro_seen_at: seenAt } : current)
      window.setTimeout(() => setWelcomePhase('complete'), 2600)
      setSavingWelcome(false)
    }
  }, [muted, savingWelcome, setProfile, user])

  const welcomeVisible = ['fly-in', 'landing', 'ready', 'talking'].includes(welcomePhase)
  const welcomeState: YatrikState = welcomePhase === 'fly-in'
    ? 'fly-in'
    : welcomePhase === 'landing'
      ? 'landing'
      : 'talking'
  const isExplore = normalizedPathname === '/explore'
  const yatrikHidden = HIDDEN_PATHS.has(normalizedPathname)
  const companionVisible = Boolean(user) && (!welcomeVisible || isExplore) && !yatrikHidden
  const controls = useMemo(() => ({ muted, toggleMute }), [muted, toggleMute])

  return (
    <YatrikControlsContext.Provider value={controls}>
      {children}
      {SHOW_WELCOME_OVERLAY && welcomeVisible && !yatrikHidden && !isExplore && (
        <YatrikWelcome
          error={welcomeError}
          manifest={manifest}
          muted={muted}
          onContinue={completeWelcome}
          onToggleMute={toggleMute}
          ready={welcomePhase === 'ready'}
          saving={savingWelcome}
          state={welcomeState}
        />
      )}
      {companionVisible && (
        <YatrikCompanion
          manifest={manifest}
          muted={muted}
          onOpenChat={() => router.push('/chat')}
          onToggleMute={toggleMute}
          state={activeEvent?.state ?? 'idle'}
        />
      )}
    </YatrikControlsContext.Provider>
  )
}
