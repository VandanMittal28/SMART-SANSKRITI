"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { saveMonument } from "@/lib/monumentStore"
import {
  addZoneToMonument,
  getCustomMonument,
  removeZoneFromMonument,
  upsertCustomMonumentName,
  type CustomZone,
} from "@/lib/customMonuments"

const DEMO_MONUMENT_ID = "college"
const DEFAULT_RADIUS = 15
const DEFAULT_XP = 50

type CaptureState =
  | { status: "idle" }
  | { status: "capturing" }
  | { status: "captured"; lat: number; lng: number; accuracy: number }
  | { status: "error"; message: string }

export default function CreateZonesPage() {
  const router = useRouter()
  const [monumentName, setMonumentName] = useState("My College Campus")
  const [zones, setZones] = useState<CustomZone[]>([])
  const [capture, setCapture] = useState<CaptureState>({ status: "idle" })
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("📍")
  const [arrivalFact, setArrivalFact] = useState("")
  const [directionHint, setDirectionHint] = useState("")
  const [radius, setRadius] = useState(DEFAULT_RADIUS)

  useEffect(() => {
    const existing = getCustomMonument(DEMO_MONUMENT_ID)
    if (existing) {
      setMonumentName(existing.name)
      setZones(existing.zones)
    }
  }, [])

  const captureLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setCapture({ status: "error", message: "This device has no location support." })
      return
    }
    setCapture({ status: "capturing" })
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCapture({
          status: "captured",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (error) => {
        setCapture({
          status: "error",
          message: error.code === error.PERMISSION_DENIED
            ? "Location access was denied. Allow it and try again."
            : "Could not get a GPS fix. Move outdoors and try again.",
        })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }, [])

  const saveZone = useCallback(() => {
    if (capture.status !== "captured") return
    if (!name.trim() || !arrivalFact.trim()) return

    const zone: CustomZone = {
      id: Date.now(),
      name: name.trim(),
      emoji: emoji.trim() || "📍",
      lat: capture.lat,
      lng: capture.lng,
      radius,
      xp: DEFAULT_XP,
      arrival_fact: arrivalFact.trim(),
      direction_hint: directionHint.trim() || `Head toward ${name.trim()}.`,
      mini_fact: "",
    }

    const updated = addZoneToMonument(DEMO_MONUMENT_ID, monumentName.trim() || "My College Campus", zone)
    setZones(updated.zones)
    setName("")
    setArrivalFact("")
    setDirectionHint("")
    setEmoji("📍")
    setRadius(DEFAULT_RADIUS)
    setCapture({ status: "idle" })
  }, [capture, name, arrivalFact, directionHint, radius, emoji, monumentName])

  const deleteZone = useCallback((zoneId: number) => {
    removeZoneFromMonument(DEMO_MONUMENT_ID, zoneId)
    setZones((prev) => prev.filter((z) => z.id !== zoneId))
  }, [])

  const startDemo = useCallback(() => {
    upsertCustomMonumentName(DEMO_MONUMENT_ID, monumentName.trim() || "My College Campus")
    saveMonument(DEMO_MONUMENT_ID, monumentName.trim() || "My College Campus")
    router.push("/explore")
  }, [monumentName, router])

  return (
    <AppShell>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
        <h1 style={{ color: "#C9A84C", fontFamily: "Georgia,serif", fontSize: 24, marginBottom: 4 }}>
          🎓 Create Demo Zones
        </h1>
        <p style={{ color: "#C4A882", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
          Walk to each spot on your route, capture it, describe it — these become live AR
          waypoints. Everything is saved on this device only.
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ color: "#F5E6D3", fontSize: 13, display: "block", marginBottom: 6 }}>
            Campus / location name
          </label>
          <input
            value={monumentName}
            onChange={(e) => setMonumentName(e.target.value)}
            placeholder="e.g. XYZ College of Engineering"
            style={{
              width: "100%", background: "rgba(28,22,56,0.9)", border: "1px solid rgba(201,168,76,0.3)",
              borderRadius: 10, padding: "10px 12px", color: "#F5E6D3", fontSize: 14,
            }}
          />
        </div>

        {zones.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ color: "#C9A84C", fontSize: 15, marginBottom: 10 }}>
              Captured zones ({zones.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {zones.map((z, i) => (
                <div
                  key={z.id}
                  style={{
                    background: "rgba(28,22,56,0.9)", border: "1px solid rgba(201,168,76,0.2)",
                    borderRadius: 10, padding: "10px 12px", display: "flex",
                    alignItems: "center", justifyContent: "space-between", gap: 8,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#F5E6D3", fontSize: 14, fontWeight: 600 }}>
                      {i + 1}. {z.emoji} {z.name}
                    </div>
                    <div style={{ color: "#C4A882", fontSize: 11 }}>
                      {z.lat.toFixed(5)}, {z.lng.toFixed(5)} · {z.radius}m radius · +{z.xp} XP
                    </div>
                  </div>
                  <button
                    onClick={() => deleteZone(z.id)}
                    style={{
                      background: "transparent", border: "1px solid rgba(220,90,90,0.4)",
                      color: "#E08A8A", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{
          background: "rgba(28,22,56,0.9)", border: "1px solid rgba(201,168,76,0.2)",
          borderRadius: 16, padding: 20, marginBottom: 20,
        }}>
          <h2 style={{ color: "#C9A84C", fontSize: 16, marginBottom: 14 }}>
            + Capture this spot
          </h2>

          <button
            onClick={captureLocation}
            disabled={capture.status === "capturing"}
            style={{
              width: "100%", background: capture.status === "captured"
                ? "linear-gradient(135deg,#4B9B8E,#3a7a6e)"
                : "linear-gradient(135deg,#C9A84C,#D4893F)",
              borderRadius: 12, padding: "12px 20px", color: capture.status === "captured" ? "white" : "#0F0B1E",
              fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", marginBottom: 12,
            }}
          >
            {capture.status === "capturing"
              ? "📡 Getting GPS fix…"
              : capture.status === "captured"
                ? `✅ Captured (±${Math.round(capture.accuracy)}m) — Recapture`
                : "📍 Capture My Location"}
          </button>

          {capture.status === "error" && (
            <p style={{ color: "#E08A8A", fontSize: 12, marginBottom: 12 }}>{capture.message}</p>
          )}

          <label style={{ color: "#F5E6D3", fontSize: 13, display: "block", marginBottom: 6 }}>
            Zone name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Main Auditorium"
            style={{
              width: "100%", background: "rgba(15,11,30,0.6)", border: "1px solid rgba(201,168,76,0.3)",
              borderRadius: 10, padding: "10px 12px", color: "#F5E6D3", fontSize: 14, marginBottom: 12,
            }}
          />

          <label style={{ color: "#F5E6D3", fontSize: 13, display: "block", marginBottom: 6 }}>
            What should the narrator say on arrival?
          </label>
          <textarea
            value={arrivalFact}
            onChange={(e) => setArrivalFact(e.target.value)}
            placeholder="e.g. This is the main auditorium, built in 1998, home to every college fest since..."
            rows={3}
            style={{
              width: "100%", background: "rgba(15,11,30,0.6)", border: "1px solid rgba(201,168,76,0.3)",
              borderRadius: 10, padding: "10px 12px", color: "#F5E6D3", fontSize: 14, marginBottom: 12,
              resize: "vertical",
            }}
          />

          <label style={{ color: "#F5E6D3", fontSize: 13, display: "block", marginBottom: 6 }}>
            Direction hint (optional)
          </label>
          <input
            value={directionHint}
            onChange={(e) => setDirectionHint(e.target.value)}
            placeholder="e.g. Walk past the fountain toward the big glass entrance."
            style={{
              width: "100%", background: "rgba(15,11,30,0.6)", border: "1px solid rgba(201,168,76,0.3)",
              borderRadius: 10, padding: "10px 12px", color: "#F5E6D3", fontSize: 14, marginBottom: 12,
            }}
          />

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: "#F5E6D3", fontSize: 13, display: "block", marginBottom: 6 }}>
                Emoji
              </label>
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                maxLength={2}
                style={{
                  width: "100%", background: "rgba(15,11,30,0.6)", border: "1px solid rgba(201,168,76,0.3)",
                  borderRadius: 10, padding: "10px 12px", color: "#F5E6D3", fontSize: 14, textAlign: "center",
                }}
              />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ color: "#F5E6D3", fontSize: 13, display: "block", marginBottom: 6 }}>
                Arrival radius (meters)
              </label>
              <input
                type="number"
                value={radius}
                onChange={(e) => setRadius(Math.max(5, Math.min(100, Number(e.target.value) || DEFAULT_RADIUS)))}
                style={{
                  width: "100%", background: "rgba(15,11,30,0.6)", border: "1px solid rgba(201,168,76,0.3)",
                  borderRadius: 10, padding: "10px 12px", color: "#F5E6D3", fontSize: 14,
                }}
              />
            </div>
          </div>

          <button
            onClick={saveZone}
            disabled={capture.status !== "captured" || !name.trim() || !arrivalFact.trim()}
            style={{
              width: "100%",
              background: capture.status === "captured" && name.trim() && arrivalFact.trim()
                ? "linear-gradient(135deg,#4B9B8E,#3a7a6e)" : "rgba(75,155,142,0.25)",
              borderRadius: 12, padding: "12px 20px", color: "white", fontWeight: 700, fontSize: 14,
              border: "none",
              cursor: capture.status === "captured" && name.trim() && arrivalFact.trim() ? "pointer" : "default",
            }}
          >
            💾 Save This Zone
          </button>
        </div>

        <button
          onClick={startDemo}
          disabled={zones.length === 0}
          style={{
            width: "100%",
            background: zones.length > 0 ? "linear-gradient(135deg,#534AB7,#3d35a0)" : "rgba(83,74,183,0.25)",
            borderRadius: 14, padding: "14px 24px", color: "white", fontWeight: 700, fontSize: 16,
            border: "none", cursor: zones.length > 0 ? "pointer" : "default",
          }}
        >
          🚀 Start Demo ({zones.length} zone{zones.length === 1 ? "" : "s"})
        </button>
      </div>
    </AppShell>
  )
}
