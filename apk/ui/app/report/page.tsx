'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Camera, MapPin, RefreshCw, ShieldAlert } from 'lucide-react'
import { VISITOR_API_BASE as REPORT_API } from '@/lib/visitorApi'


const categories = ['Property damage', 'Littering', 'Restricted access', 'Harassment', 'Safety hazard', 'Other site-rule concern']
type Point = { latitude: number; longitude: number; accuracy: number }
type Site = { id: string; name: string; city: string; state: string }
type Zone = { id: string; site_id: string; zone_key: string; name: string }
type Catalog = { sites: Site[]; zones: Zone[] }
type Draft = { id: string; token: string; siteId: string; category: string; note: string; zoneId: string; point: Point | null; photo: string | null }
type Receipt = { id: string; token: string }

async function reportRequest<T>(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${REPORT_API}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Report service is unavailable')
  return result as T
}

function createDraft(siteId = 'taj-mahal', zoneId = 'main-mausoleum'): Draft {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return {
    id: crypto.randomUUID(), token: Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''),
    siteId, category: categories[0], note: '', zoneId, point: null, photo: null,
  }
}

async function photoData(file: File): Promise<string> {
  if (file.size > 8_000_000) throw new Error('Choose a photo under 8 MB')
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use JPEG, PNG or WebP')
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read photo'))
    reader.readAsDataURL(file)
  })
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const value = new Image(); value.onload = () => resolve(value); value.onerror = () => reject(new Error('Could not open photo')); value.src = source
  })
  const scale = Math.min(1, 1600 / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale)
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
  return await new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (!blob || blob.size > 1_900_000) { reject(new Error('Photo is too large after compression')); return }
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not prepare photo')); reader.readAsDataURL(blob)
  }, 'image/jpeg', 0.84))
}

const key = 'sanskriti-report-draft-v2'
const receiptKey = 'sanskriti-report-receipt-v2'

export default function ReportPage() {
  const [returnPath, setReturnPath] = useState('/login')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const zones = useMemo(() => catalog?.zones.filter(zone => zone.site_id === draft?.siteId) ?? [], [catalog, draft?.siteId])

  useEffect(() => {
    try {
      const previous = sessionStorage.getItem('sanskriti-report-return')
      if (previous?.startsWith('/') && !previous.startsWith('//') && !previous.startsWith('/report')) setReturnPath(previous)
      const saved = localStorage.getItem(key)
      const previousDraft = saved ? JSON.parse(saved) as Partial<Draft> : null
      const current = createDraft(previousDraft?.siteId, previousDraft?.zoneId)
      setDraft({ ...current, ...previousDraft, id: previousDraft?.id || current.id, token: previousDraft?.token || current.token })
      const savedReceipt = localStorage.getItem(receiptKey)
      if (savedReceipt) setReceipt(JSON.parse(savedReceipt) as Receipt)
    } catch { setDraft(createDraft()) }
    void reportRequest<Catalog>('/api/reports').then(value => {
      setCatalog(value)
      setDraft(current => {
        if (!current) return createDraft(value.sites[0]?.id ?? 'taj-mahal', value.zones.find(zone => zone.site_id === value.sites[0]?.id)?.zone_key ?? '')
        const site = value.sites.some(item => item.id === current.siteId) ? current.siteId : value.sites[0]?.id ?? 'taj-mahal'
        const siteZones = value.zones.filter(zone => zone.site_id === site)
        const zone = siteZones.some(item => item.zone_key === current.zoneId) ? current.zoneId : siteZones[0]?.zone_key ?? ''
        return { ...current, siteId: site, zoneId: zone }
      })
    }).catch(() => setError('The site list could not be loaded. Check your internet connection and retry.'))
  }, [])

  useEffect(() => { if (draft) localStorage.setItem(key, JSON.stringify(draft)) }, [draft])
  useEffect(() => {
    if (!receipt) return
    const refresh = async () => {
      try { const result = await reportRequest<{ status: string }>(`/api/reports?id=${encodeURIComponent(receipt.id)}&token=${encodeURIComponent(receipt.token)}`); setStatus(result.status) }
      catch { setStatus('Status unavailable while offline') }
    }
    void refresh(); const timer = setInterval(() => void refresh(), 10_000); return () => clearInterval(timer)
  }, [receipt])

  const change = (update: Partial<Draft>) => setDraft(previous => previous ? { ...previous, ...update } : previous)
  function locate() {
    if (!navigator.geolocation) { setError('Location unavailable. Choose the area below.'); return }
    navigator.geolocation.getCurrentPosition(position => {
      change({ point: { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy } }); setError('')
    }, () => setError('Location unavailable. Choose the area below.'), { enableHighAccuracy: true, timeout: 10_000 })
  }
  async function submit() {
    if (!draft) return
    if (!draft.siteId || !draft.zoneId) { setError('Choose the site and area for this report.'); return }
    setBusy(true); setError('')
    try {
      const result = await reportRequest<{ id: string; status: string }>('/api/reports', 'POST', draft)
      const saved = { id: result.id, token: draft.token }
      localStorage.setItem(receiptKey, JSON.stringify(saved)); localStorage.removeItem(key); setReceipt(saved); setStatus(result.status); setDraft(null)
    } catch (problem) { setError(`${(problem as Error).message}. Your draft is saved on this device; retry when connected.`) }
    finally { setBusy(false) }
  }

  const site = catalog?.sites.find(item => item.id === draft?.siteId)
  return <main className="min-h-dvh bg-[#0b1423] px-5 pb-12 pt-[calc(env(safe-area-inset-top)+24px)] text-[#f5f0e5]"><div className="mx-auto max-w-[440px]">
    <Link href={returnPath} className="text-sm text-[#e8be69]">← Back to app</Link>
    <div className="mt-8 flex items-center gap-3"><ShieldAlert className="size-8 text-[#e8be69]"/><div><p className="text-xs uppercase tracking-widest text-[#caa967]">Sanskriti · monument services</p><h1 className="font-heritage text-3xl">Report an issue</h1></div></div>
    <p className="mt-3 text-sm leading-6 text-[#aeb6c8]">Send an issue directly to the site team. You can report without giving your name. For urgent help, contact staff nearby.</p>
    {receipt && <section className="mt-5 rounded-2xl border border-[#63c7ba]/30 bg-[#15363b] p-4"><h2 className="font-bold">Report received</h2><p className="mt-2 text-sm">Status: {status.replaceAll('_', ' ') || 'Checking…'}</p><p className="mt-1 text-xs text-[#aeb6c8]">Private receipt: {receipt.id.slice(0, 8).toUpperCase()}</p><button className="mt-3 text-sm font-semibold text-[#e8be69]" onClick={() => { setReceipt(null); localStorage.removeItem(receiptKey); setDraft(createDraft()) }}>Report another issue</button></section>}
    {!receipt && draft && <div className="mt-6 space-y-5">
      <label className="block text-sm font-semibold">Heritage site<select className="mt-2 w-full rounded-xl border border-white/20 bg-[#1b2a3b] p-3" value={draft.siteId} onChange={event => change({ siteId: event.target.value, zoneId: zones.find(zone => zone.site_id === event.target.value)?.zone_key ?? '' })} disabled={!catalog}>{catalog?.sites.map(item => <option key={item.id} value={item.id}>{item.name} · {item.city}</option>)}</select></label>
      <label className="block text-sm font-semibold">What happened?<select className="mt-2 w-full rounded-xl border border-white/20 bg-[#1b2a3b] p-3" value={draft.category} onChange={event => change({ category: event.target.value })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
      <label className="block text-sm font-semibold">Area at {site?.name ?? 'the site'}<select className="mt-2 w-full rounded-xl border border-white/20 bg-[#1b2a3b] p-3" value={draft.zoneId} onChange={event => change({ zoneId: event.target.value })} disabled={!zones.length}>{zones.map(zone => <option key={zone.id} value={zone.zone_key}>{zone.name}</option>)}</select></label>
      <label className="block text-sm font-semibold">Photo (optional)<span className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-[#e8be69]/45 bg-[#172536] p-4"><Camera className="size-5"/> Take or choose photo</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={async event => { const file = event.target.files?.[0]; if (file) try { change({ photo: await photoData(file) }); setError('') } catch (problem) { setError((problem as Error).message) } }}/></label>
      {draft.photo && <div><img alt="Selected report photo" src={draft.photo} className="max-h-48 w-full rounded-xl object-cover"/><button onClick={() => change({ photo: null })} className="mt-1 text-xs text-[#e8be69]">Remove photo</button></div>}
      <label className="block text-sm font-semibold">Details (optional)<textarea className="mt-2 min-h-24 w-full rounded-xl border border-white/20 bg-[#1b2a3b] p-3" maxLength={1200} placeholder="Describe what the site team should look for" value={draft.note} onChange={event => change({ note: event.target.value })}/></label>
      <div><p className="text-sm font-semibold">Incident location</p><button onClick={locate} className="mt-2 flex items-center gap-2 rounded-xl border border-[#63c7ba]/40 px-3 py-2 text-sm text-[#8de0d6]"><MapPin className="size-4"/>{draft.point ? `Location captured ±${Math.round(draft.point.accuracy)} m` : 'Use my current location'}</button><p className="mt-2 text-xs text-[#aeb6c8]">Your position may differ from where the issue happened. Location sharing is optional.</p>{draft.point && <button className="mt-2 text-xs text-[#e8be69]" onClick={() => change({ point: null })}>Remove exact location</button>}</div>
      {error && <p role="alert" className="rounded-xl bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
      <button disabled={busy || !catalog} onClick={() => void submit()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e8be69] p-4 font-bold text-[#1b1d20] disabled:opacity-60">{busy && <RefreshCw className="size-4 animate-spin"/>}{busy ? 'Sending…' : 'Send report'}</button>
      <p className="text-center text-xs text-[#aeb6c8]">Reports go to the site team through Sanskriti MMS.</p>
    </div>}
  </div></main>
}
