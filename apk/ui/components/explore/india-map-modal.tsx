"use client"

import { useEffect, useRef, useState } from "react"
import { Crosshair, X } from "lucide-react"

type IndiaMarker = {
  name: string
  lat: number
  lng: number
  city: string
  snippet: string
  monumentId: string
}

const INDIA_CENTER: [number, number] = [22.5937, 79.9629]
const MONUMENT_MARKERS: IndiaMarker[] = [
  {
    name: "Taj Mahal",
    lat: 27.1751,
    lng: 78.0421,
    city: "Agra",
    snippet: "Marble poetry built by Shah Jahan in memory of Mumtaz beside the Yamuna.",
    monumentId: "taj-mahal",
  },
  {
    name: "Red Fort",
    lat: 28.6562,
    lng: 77.241,
    city: "Delhi",
    snippet: "Seat of Mughal power and the stage for India's Independence Day speech.",
    monumentId: "red-fort",
  },
  {
    name: "Qutub Minar",
    lat: 28.5244,
    lng: 77.1855,
    city: "Delhi",
    snippet: "A soaring victory tower layered with Indo-Islamic craftsmanship.",
    monumentId: "qutub-minar",
  },
]

interface IndiaMapModalProps {
  open: boolean
  onClose: () => void
  demoMode: boolean
  onToggleDemoMode: () => void
  onExploreMonument: (marker: IndiaMarker) => void
}

export function IndiaMapModal({
  open,
  onClose,
  demoMode,
  onToggleDemoMode,
  onExploreMonument,
}: IndiaMapModalProps) {
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<IndiaMarker | null>(MONUMENT_MARKERS[0])

  useEffect(() => {
    if (!open || typeof window === "undefined") return
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.id = "leaflet-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }

    const L = require("leaflet")
    if (!containerRef.current) return

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        center: INDIA_CENTER,
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
      })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mapRef.current)
      L.control.zoom({ position: "topright" }).addTo(mapRef.current)
    }

    markersRef.current.forEach((marker) => mapRef.current.removeLayer(marker))
    markersRef.current = []

    MONUMENT_MARKERS.forEach((markerData) => {
      const marker = L.marker([markerData.lat, markerData.lng], {
        icon: L.divIcon({
          className: "",
          html: "<div style='width:40px;height:40px;border-radius:999px;background:radial-gradient(circle at 30% 30%,#F8E3A2,#C9A84C 58%,#8E6F2A);display:flex;align-items:center;justify-content:center;color:#0F0B1E;font-weight:900;border:2px solid rgba(255,255,255,0.45);box-shadow:0 8px 20px rgba(201,168,76,0.45)'>⛳</div>",
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        }),
      }).addTo(mapRef.current)

      marker.on("click", () => {
        setSelected(markerData)
        mapRef.current.flyTo([markerData.lat, markerData.lng], 8, { duration: 0.9 })
      })

      markersRef.current.push(marker)
    })

    setTimeout(() => mapRef.current?.invalidateSize(), 120)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] bg-[#08070F]/90 backdrop-blur-md">
      <div className="mx-auto flex h-screen w-full max-w-[420px] flex-col">
        <div className="flex items-center justify-between border-b border-[#C9A84C]/25 bg-[#0C0A15]/95 px-4 py-3">
          <h2 className="font-serif text-xl font-semibold text-[#C9A84C]">Explore India</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#C9A84C]"
            aria-label="Close map"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative flex-1">
          <div ref={containerRef} className="h-full w-full" />
          <div className="absolute right-3 top-3 flex flex-col gap-2">
            <button
              onClick={() => mapRef.current?.flyTo(INDIA_CENTER, 5, { duration: 0.8 })}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C9A84C]/30 bg-[#0F0B1E]/85 text-[#C9A84C]"
              aria-label="Recenter India map"
            >
              <Crosshair className="h-4 w-4" />
            </button>
            <button
              onClick={onToggleDemoMode}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${demoMode ? "border-[#4B9B8E]/45 bg-[#4B9B8E]/20 text-[#7EE4D4]" : "border-[#C9A84C]/30 bg-[#0F0B1E]/85 text-[#C9A84C]"}`}
            >
              Demo {demoMode ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        {selected && (
          <div className="rounded-t-3xl border-t border-[#C9A84C]/25 bg-[#0F0B1E]/95 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#7A6E5C]">{selected.city}</p>
            <h3 className="mt-1 text-lg font-semibold text-[#F5E6D3]">{selected.name}</h3>
            <p className="mt-1 text-sm leading-relaxed text-[#C4A882]">{selected.snippet}</p>
            <button
              onClick={() => onExploreMonument(selected)}
              className="mt-3 w-full rounded-2xl bg-[linear-gradient(135deg,#D4893F,#C9A84C)] px-4 py-3 text-sm font-bold text-[#0F0B1E]"
            >
              Explore This Monument
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
