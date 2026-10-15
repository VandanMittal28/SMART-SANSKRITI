'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map, LayerGroup } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { HuntPosition } from '@/lib/hunt'

type Checkpoint = { id: number; target_lat: number; target_lng: number; radius_meters: number; location_name: string }

export default function HuntMap({ clues, completed, position, recenter }: {
  clues: Checkpoint[]; completed: number; position: HuntPosition | null; recenter: number
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const layers = useRef<LayerGroup | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    let resize: ResizeObserver | undefined
    void import('leaflet').then(L => {
      if (cancelled || !container.current) return
      map.current = L.map(container.current).setView([clues[0].target_lat, clues[0].target_lng], 17)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).on('tileerror', () => setFailed(true)).addTo(map.current)
      layers.current = L.layerGroup().addTo(map.current)
      resize = new ResizeObserver(() => map.current?.invalidateSize())
      resize.observe(container.current)
      setReady(true)
    }).catch(() => setFailed(true))
    return () => { cancelled = true; resize?.disconnect(); map.current?.remove(); map.current = null }
  }, [clues])

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    void import('leaflet').then(L => {
      if (cancelled || !map.current || !layers.current) return
      layers.current.clearLayers()
      clues.forEach((clue, index) => {
        const marker = L.circleMarker([clue.target_lat, clue.target_lng], {
          radius: index === completed ? 12 : 8, color: index < completed ? '#63C7BA' : '#D6A84B', fillOpacity: 0.8,
        }).addTo(layers.current!)
        const label = document.createElement('span')
        label.textContent = `${index + 1}. ${clue.location_name}${index < completed ? ' — complete' : ''}`
        marker.bindPopup(label)
        if (index === completed) L.circle([clue.target_lat, clue.target_lng], {
          radius: clue.radius_meters, color: '#D6A84B', weight: 1, fillOpacity: 0.08,
        }).addTo(layers.current!)
      })
      if (position) {
        L.circleMarker([position.lat, position.lng], { radius: 8, color: '#fff', fillColor: '#3b82f6', fillOpacity: 1 })
          .bindTooltip('Your GPS location').addTo(layers.current)
        L.circle([position.lat, position.lng], { radius: position.accuracy, color: '#3b82f6', weight: 1, fillOpacity: 0.08 }).addTo(layers.current)
      }
    })
    return () => { cancelled = true }
  }, [clues, completed, position, ready])

  useEffect(() => {
    const clue = clues[Math.min(completed, clues.length - 1)]
    if (ready) map.current?.setView([clue.target_lat, clue.target_lng], 17)
  }, [clues, completed, recenter, ready])

  return <div>
    <div ref={container} className="relative z-0 h-64 w-full rounded-2xl" aria-label="Checkpoint map" />
    {failed && <p className="mt-2 text-xs text-[#AEB6C8]">Map tiles are unavailable. You can still use the clue, hint, and GPS checkpoint check.</p>}
  </div>
}
