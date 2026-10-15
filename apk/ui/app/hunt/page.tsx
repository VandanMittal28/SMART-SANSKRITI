'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { MapPin, Trophy, Volume2, Share2, Crosshair } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/lib/authContext'
import { addXP, computeAndSaveBadges } from '@/lib/authClient'
import { getMonument, saveMonument } from '@/lib/monumentStore'
import { MONUMENT_RIDDLES, HUNT_NAMES, newProgress, readProgress, progressKey, checkCheckpoint, distanceMeters } from '@/lib/hunt'
import type { HuntMode, HuntPosition, HuntProgress } from '@/lib/hunt'

const HuntMap = dynamic(() => import('@/components/hunt-map'), { ssr: false, loading: () => <div className="h-64 rounded-2xl bg-white/5 p-4">Loading map…</div> })
const primary = 'min-h-12 w-full rounded-xl gold-gradient px-4 py-3 font-bold text-[#080D1D] disabled:opacity-50'
const secondary = 'min-h-11 rounded-xl border border-[#D6A84B]/40 px-4 py-2 text-sm font-semibold text-[#D6A84B] disabled:opacity-50'

export default function HuntPage() {
  const { user, loading } = useAuth()
  // Remount on identity changes: an outstanding GPS or reward response must never enter another person's hunt.
  return <AppShell>{loading ? <p className="p-6" role="status">Loading your hunt…</p> : <SoloHunt key={user?.id || 'guest'} />}</AppShell>
}

function SoloHunt() {
  const { user, setProfile } = useAuth()
  const [monument, setMonument] = useState('taj-mahal')
  const [mode, setMode] = useState<HuntMode>('onsite')
  const [progress, setProgress] = useState<HuntProgress | null>(null)
  const [active, setActive] = useState(false)
  const [ready, setReady] = useState(false)
  const [hint, setHint] = useState(false)
  const [position, setPosition] = useState<HuntPosition | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [storageWarning, setStorageWarning] = useState('')
  const [recenter, setRecenter] = useState(0)
  const request = useRef(0)
  const locked = useRef(false)
  const mounted = useRef(true)
  const top = useRef<HTMLDivElement>(null)
  const clues = MONUMENT_RIDDLES[monument]
  const completed = progress?.completed || 0
  const finished = completed === clues.length
  const clue = clues[completed]
  const key = progressKey(user?.id, monument, mode)
  const score = completed * 50 + (finished ? 500 : 0)

  useEffect(() => {
    const stored = getMonument()?.id
    if (stored && MONUMENT_RIDDLES[stored]) setMonument(stored)
    setReady(true)
    mounted.current = true
    return () => { mounted.current = false; request.current++; window.speechSynthesis?.cancel() }
  }, [])

  useEffect(() => {
    if (!ready) return
    request.current++
    locked.current = false
    setBusy(false)
    setActive(false)
    setHint(false)
    setPosition(null)
    setMessage('')
    try { setProgress(readProgress(localStorage.getItem(key), clues.length)) }
    catch { setProgress(null); setStorageWarning('Device storage is unavailable. Keep this page open to retain your progress.') }
  }, [key, ready, clues.length])

  useEffect(() => {
    if (active) top.current?.scrollIntoView({ block: 'start' })
  }, [active, completed])

  function persist(next: HuntProgress) {
    setProgress(next)
    try { localStorage.setItem(key, JSON.stringify(next)); return true }
    catch { setStorageWarning('Progress could not be saved on this device. Keep this page open.'); return false }
  }

  function pause() {
    request.current++
    locked.current = false
    setBusy(false)
    setActive(false)
    setMessage('')
    window.speechSynthesis?.cancel()
  }

  function start() {
    if (!progress) persist(newProgress())
    saveMonument(monument, HUNT_NAMES[monument])
    setActive(true)
    setMessage('')
  }

  function completeCheckpoint() {
    if (!progress || finished) return
    persist({ ...progress, completed: completed + 1 })
    setHint(false)
    setMessage(mode === 'practice' ? 'Practice checkpoint complete.' : 'Checkpoint verified! +50 hunt points.')
    window.speechSynthesis?.cancel()
  }

  function verify() {
    if (locked.current || !clue || !progress) return
    if (mode === 'practice') { completeCheckpoint(); return }
    if (!navigator.geolocation) { setMessage('This device does not provide location. Use practice mode, or open the hunt on a GPS-enabled device.'); return }
    locked.current = true
    setBusy(true)
    setMessage('Checking your current GPS location…')
    const token = ++request.current
    navigator.geolocation.getCurrentPosition(pos => {
      if (!mounted.current || request.current !== token) return
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: pos.timestamp }
      setPosition(point)
      const result = checkCheckpoint(point, clue)
      if (result.verified) completeCheckpoint()
      else setMessage(result.message)
      locked.current = false
      setBusy(false)
    }, error => {
      if (!mounted.current || request.current !== token) return
      setMessage(error.code === 1
        ? 'Location permission was denied. Allow location in your browser or app settings, then try again. Your progress is saved.'
        : 'GPS could not get a location. Move to an open visitor area and try again. No checkpoint was completed.')
      locked.current = false
      setBusy(false)
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 })
  }

  async function claimReward() {
    if (!user || !progress || !finished || mode !== 'onsite' || progress.reward !== 'none' || locked.current) return
    if (!navigator.onLine) { setMessage('Connect to the internet, then save your XP. Your completed hunt is saved on this device.'); return }
    // Persist the attempt before sending. The existing XP service has no idempotency key,
    // so an ambiguous response must not be automatically retried after a reload.
    try {
      const latest = readProgress(localStorage.getItem(key), clues.length)
      if (latest && latest.reward !== 'none') { setProgress(latest); return }
    } catch { setMessage('Enable device storage before saving profile XP.'); return }
    const pending: HuntProgress = { ...progress, reward: 'pending' }
    if (!persist(pending)) { setProgress(progress); setMessage('Enable device storage before saving profile XP.'); return }
    locked.current = true
    setBusy(true)
    const token = ++request.current
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      const total = await Promise.race([
        addXP(user.id, score, 'HUNT_COMPLETED'),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('XP confirmation timed out')), 15000) }),
      ])
      const saved: HuntProgress = { ...pending, reward: 'saved' }
      try { localStorage.setItem(key, JSON.stringify(saved)) } catch { /* The persisted pending marker still prevents duplicate submission. */ }
      if (mounted.current && request.current === token) {
        setProgress(saved)
        setProfile(prev => prev ? { ...prev, total_xp: total } : prev)
        setMessage(`${score} XP saved to your profile.`)
        window.dispatchEvent(new Event('xp-updated'))
      }
      void computeAndSaveBadges(user.id, { total_xp: total }).catch(() => {})
    } catch {
      const uncertain: HuntProgress = { ...pending, reward: 'unconfirmed' }
      try { localStorage.setItem(key, JSON.stringify(uncertain)) } catch { /* Retain the pending marker. */ }
      if (mounted.current && request.current === token) {
        setProgress(uncertain)
        setMessage('XP could not be confirmed. Check your profile activity before contacting support; your hunt remains complete.')
      }
    } finally {
      clearTimeout(timeout)
      if (mounted.current && request.current === token) { locked.current = false; setBusy(false) }
    }
  }

  function speak() {
    if (!window.speechSynthesis) { setMessage('Voice clues are unavailable on this device. The full clue is shown below.'); return }
    window.speechSynthesis.cancel()
    const speech = new SpeechSynthesisUtterance(clue.riddle)
    speech.lang = 'en-IN'
    speech.rate = 0.9
    window.speechSynthesis.speak(speech)
  }

  async function share() {
    const text = `I completed the ${HUNT_NAMES[monument]} ${mode === 'practice' ? 'practice ' : ''}Treasure Hunt on Sanskriti AI: ${clues.length} checkpoints!`
    try {
      if (navigator.share) await navigator.share({ title: 'My solo treasure hunt', text })
      else { await navigator.clipboard.writeText(text); setMessage('Achievement copied to clipboard.') }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setMessage('Sharing is unavailable. You completed all five checkpoints!')
    }
  }

  if (!ready) return <p className="p-6" role="status">Loading your hunt…</p>

  return <div ref={top} className="space-y-5 px-4 pt-5 pb-28 text-[#F6F1E8]">
    <header>
      <Link href="/explore" className="text-sm text-[#D6A84B]">← Explore monuments</Link>
      <h1 className="mt-4 font-serif text-3xl font-bold text-[#D6A84B]">Treasure Hunt</h1>
      <p className="mt-2 text-sm text-[#AEB6C8]">Your own adventure, at your own pace.</p>
    </header>
    {storageWarning && <p role="alert" className="rounded-xl border border-amber-400/40 p-3 text-sm">{storageWarning}</p>}
    {!active ? <section className="space-y-4 rounded-2xl border border-white/10 bg-[#171F34] p-4">
      <h2 className="text-xl font-semibold">Plan your solo hunt</h2>
      <label className="block text-sm" htmlFor="hunt-monument">Choose a monument</label>
      <select id="hunt-monument" value={monument} onChange={e => setMonument(e.target.value)} className="min-h-12 w-full rounded-xl border border-white/20 bg-[#080D1D] px-3">
        {Object.entries(HUNT_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm">How would you like to play?</legend>
        {(['onsite', 'practice'] as const).map(value => <label key={value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 p-3">
          <input type="radio" name="hunt-mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="mt-1" />
          <span><strong>{value === 'onsite' ? 'On-site solo hunt' : 'Practice from anywhere'}</strong><span className="mt-1 block text-xs text-[#AEB6C8]">{value === 'onsite' ? 'Visit each checkpoint and verify with GPS.' : 'Explore clues without location access. No profile XP.'}</span></span>
        </label>)}
      </fieldset>
      <p className="text-sm text-[#AEB6C8]">5 checkpoints · 50 points each · 500 completion bonus. Hints are free. No other players or timer.</p>
      <p className="text-xs text-[#AEB6C8]">Stay on permitted visitor paths and follow site staff. Never enter a closed area to reach a marker. You can pause and return later.</p>
      <p className="text-xs text-[#AEB6C8]">Progress is saved on this device, separately for each monument and mode.{!user && ' You are playing as a guest. Sign in before starting if you want profile XP.'}</p>
      {progress && <p className="text-sm text-[#63C7BA]">{finished ? 'Completed hunt saved' : `Saved progress: ${completed} of 5 checkpoints`}</p>}
      <button onClick={start} className={primary}>{finished ? 'View completed hunt' : progress ? 'Resume hunt' : mode === 'onsite' ? 'Start solo hunt' : 'Start practice'}</button>
      {!user && <Link href="/login" className="block py-2 text-center text-sm text-[#D6A84B]">Sign in for profile XP</Link>}
    </section> : <>
      <div className="flex items-center justify-between gap-2">
        <div><h2 className="font-serif text-xl font-bold">{HUNT_NAMES[monument]}</h2><p className="text-xs text-[#D6A84B]">{mode === 'practice' ? 'Practice · no profile XP' : 'Solo · GPS verification'}</p></div>
        <button onClick={pause} disabled={busy && finished} className={secondary}>{finished ? 'Choose hunt' : 'Pause / change'}</button>
      </div>
      <div>
        <div className="mb-2 flex justify-between text-sm"><span>{completed} of {clues.length} complete</span><span>{score} points</span></div>
        <progress className="h-2 w-full accent-[#D6A84B]" value={completed} max={clues.length} aria-label="Hunt progress" />
      </div>
      {finished ? <section className="space-y-4 rounded-2xl border border-[#D6A84B]/40 bg-[#171F34] p-5 text-center">
        <Trophy className="mx-auto h-12 w-12 text-[#D6A84B]" />
        <h2 className="text-2xl font-bold">{mode === 'practice' ? 'Practice complete!' : 'Hunt complete!'}</h2>
        <p>You found all {clues.length} checkpoints. {score} hunt points, including your 500-point completion bonus.</p>
        {mode === 'onsite' && user && progress?.reward === 'none' && <button onClick={() => void claimReward()} disabled={busy} className={primary}>Save {score} XP to my profile</button>}
        {mode === 'onsite' && !user && <p className="text-sm text-[#AEB6C8]">Your guest result is saved on this device. Profile XP requires starting a hunt while signed in.</p>}
        {progress?.reward === 'saved' && <p className="text-[#63C7BA]">{score} XP saved to your profile.</p>}
        {(progress?.reward === 'pending' || progress?.reward === 'unconfirmed') && <p role="status" className="text-sm text-[#AEB6C8]">{busy ? 'Saving profile XP…' : 'XP submission is unconfirmed. Check your profile activity. We will not submit it again to avoid duplicate XP.'}</p>}
        <button onClick={() => void share()} className={`${secondary} inline-flex items-center gap-2`}><Share2 size={16} /> Share achievement</button>
        <Link href="/profile" className="block py-2 text-sm text-[#D6A84B]">View profile</Link>
        {mode === 'practice' && <button className={secondary} onClick={() => { persist(newProgress()); setMessage(''); setHint(false) }}>Practice again</button>}
      </section> : <>
        <section className="space-y-4 rounded-2xl border border-[#D6A84B]/30 bg-[#171F34] p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold text-[#D6A84B]">Clue {completed + 1}</h2><button onClick={speak} className={secondary} aria-label="Read clue aloud"><Volume2 size={18} /></button></div>
          <p className="font-serif text-lg leading-relaxed">{clue.riddle}</p>
          <button onClick={() => setHint(!hint)} className={secondary} aria-expanded={hint} aria-controls="hunt-hint">{hint ? 'Hide hint' : 'Show free hint'}</button>
          {hint && <p id="hunt-hint" className="rounded-xl bg-white/5 p-3 text-sm text-[#D6A84B]">{clue.hint}</p>}
          {mode === 'onsite' && <p className="text-xs text-[#AEB6C8]">Reach the public visitor area within {clue.radius_meters} m of the marker. Location is requested only when you check a checkpoint.</p>}
          <button onClick={verify} disabled={busy} className={`${primary} flex items-center justify-center gap-2`}><MapPin size={18} />{busy ? 'Checking GPS…' : mode === 'practice' ? 'Reveal and complete checkpoint' : 'I am here — check GPS'}</button>
          {position && mode === 'onsite' && <p className="text-xs text-[#AEB6C8]">Last GPS reading: ±{Math.round(position.accuracy)} m accuracy · about {Math.round(distanceMeters(position.lat, position.lng, clue.target_lat, clue.target_lng))} m from this checkpoint.</p>}
        </section>
        <HuntMap key={monument} clues={clues} completed={completed} position={position} recenter={recenter} />
        <button onClick={() => setRecenter(value => value + 1)} className={`${secondary} inline-flex items-center gap-2`}><Crosshair size={16} /> Recenter checkpoint map</button>
      </>}
      <details className="rounded-xl border border-white/10 p-4">
        <summary className="cursor-pointer text-sm font-semibold">Your checkpoint trail</summary>
        <ol className="mt-3 space-y-2 text-sm">{clues.map((item, index) => <li key={item.id} className={index < completed ? 'text-[#63C7BA]' : 'text-[#AEB6C8]'}>{index < completed ? '✓' : `${index + 1}.`} {index < completed || finished ? item.location_name : `Checkpoint ${index + 1}`}</li>)}</ol>
      </details>
    </>}
    <p role="status" aria-live="polite" className="rounded-xl text-sm text-[#E8BE69]">{message}</p>
  </div>
}
