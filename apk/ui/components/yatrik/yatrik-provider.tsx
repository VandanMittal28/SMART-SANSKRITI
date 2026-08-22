'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { YatrikCompanion } from '@/components/yatrik/yatrik-companion'
import { YatrikWelcome } from '@/components/yatrik/yatrik-welcome'
import { useAuth } from '@/lib/authContext'
import { useLang } from '@/lib/languageContext'
import { markMascotIntroSeen } from '@/lib/authClient'
import { hasNativeNvidia, synthesizeNarrationNative, translateTextsNative } from '@/lib/nativeNvidia'
import { getYatrikNarrationVoice } from '@/lib/narrationProfiles'
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

function speakWithDeviceVoice(text: string, language: string): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve()
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = language
  utterance.rate = 0.9
  utterance.pitch = 0.9
  return new Promise((resolve) => {
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
  })
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
  const { lang } = useLang()
  const [manifest, setManifest] = useState<YatrikAssetManifest | null>(null)
  const [muted, setMuted] = useState(false)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [welcomePhase, setWelcomePhase] = useState<WelcomePhase>('idle')
  const [welcomeError, setWelcomeError] = useState<string | null>(null)
  const [savingWelcome, setSavingWelcome] = useState(false)
  const [activeEvent, setActiveEvent] = useState<YatrikEvent | null>(null)
  const [queue, setQueue] = useState<YatrikEvent[]>([])
  const activeEventRef = useRef<YatrikEvent | null>(null)
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null)
  const welcomeAudioUrlRef = useRef<string | null>(null)
  const welcomeSpeechTokenRef = useRef(0)
  const eventSpeechTokenRef = useRef(0)

  const stopWelcomeSpeech = useCallback(() => {
    welcomeSpeechTokenRef.current += 1
    if (welcomeAudioRef.current) {
      welcomeAudioRef.current.pause()
      welcomeAudioRef.current.src = ''
      welcomeAudioRef.current = null
    }
    if (welcomeAudioUrlRef.current) {
      URL.revokeObjectURL(welcomeAudioUrlRef.current)
      welcomeAudioUrlRef.current = null
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

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

  useEffect(() => {
    eventSpeechTokenRef.current += 1
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    activeEventRef.current = null
    setActiveEvent(null)
    setQueue([])
  }, [normalizedPathname])

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
      if (!muted) {
        const token = ++eventSpeechTokenRef.current
        const source = activeEvent.narration ?? activeEvent.caption
        void (async () => {
          let narration = source
          if (lang !== 'en' && hasNativeNvidia()) {
            try {
              ;[narration] = await translateTextsNative([source], lang)
            } catch {
              // The original narration remains a usable offline fallback.
            }
          }
          if (eventSpeechTokenRef.current !== token) return
          await speakWithDeviceVoice(narration, getYatrikNarrationVoice(lang)?.language ?? lang)
        })()
      }
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
  }, [activeEvent, lang, muted])

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

  useEffect(() => () => stopWelcomeSpeech(), [stopWelcomeSpeech])

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, String(next))
      } catch {
        // The preference remains available for the current session.
      }
      if (next) stopWelcomeSpeech()
      return next
    })
  }, [stopWelcomeSpeech])

  const playWelcomeGreeting = useCallback(async (text: string) => {
    if (muted) return
    stopWelcomeSpeech()
    const token = welcomeSpeechTokenRef.current
    const voice = getYatrikNarrationVoice(lang)

    if (hasNativeNvidia() && voice) {
      try {
        const audioBase64 = await synthesizeNarrationNative(text, voice.language, voice.voice)
        if (welcomeSpeechTokenRef.current !== token) return
        const binary = window.atob(audioBase64)
        const bytes = new Uint8Array(binary.length)
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
        const audioUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }))
        const audio = new Audio(audioUrl)
        welcomeAudioRef.current = audio
        welcomeAudioUrlRef.current = audioUrl
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve()
          audio.onerror = () => reject(new Error('NVIDIA welcome audio could not be played.'))
          audio.play().catch(reject)
        })
        return
      } catch (error) {
        if (welcomeSpeechTokenRef.current !== token) return
        console.warn('NVIDIA welcome voice failed; using the device voice:', error)
      } finally {
        if (welcomeSpeechTokenRef.current === token) {
          if (welcomeAudioUrlRef.current) URL.revokeObjectURL(welcomeAudioUrlRef.current)
          welcomeAudioRef.current = null
          welcomeAudioUrlRef.current = null
        }
      }
    }

    if (welcomeSpeechTokenRef.current === token) {
      await speakWithDeviceVoice(text, voice?.language ?? 'en-US')
    }
  }, [lang, muted, stopWelcomeSpeech])

  const completeWelcome = useCallback(async () => {
    if (!user || savingWelcome) return
    let greeting = "Hi, I'm Yatrik. I'll be your friendly companion for stories, routes, and heritage discoveries."
    setWelcomeError(null)
    setSavingWelcome(true)
    setWelcomePhase('talking')

    let seenAt = new Date().toISOString()
    try {
      if (lang !== 'en' && hasNativeNvidia()) {
        ;[greeting] = await translateTextsNative([greeting], lang)
      }
      await playWelcomeGreeting(greeting)
      seenAt = await markMascotIntroSeen(user.id)
    } catch {
      // The deployed database may not have the optional welcome column yet,
      // or the phone may be offline. Device-local persistence keeps this
      // non-critical introduction from blocking the installed app.
    } finally {
      saveLocalWelcome(user.id)
      setProfile((current) => current ? { ...current, mascot_intro_seen_at: seenAt } : current)
      stopWelcomeSpeech()
      setWelcomePhase('complete')
      setSavingWelcome(false)
    }
  }, [lang, playWelcomeGreeting, savingWelcome, setProfile, stopWelcomeSpeech, user])

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
