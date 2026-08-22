"use client"

/**
 * Placeholder presentation layer for the Explore AR camera journey.
 *
 * This is intentionally plain/neutral styling — the PRD assigns the final
 * HUD art direction (mascot, golden target treatment, etc.) to a separate
 * workstream. This component only renders the typed navigation state it is
 * given; it owns no camera/GPS/permission logic itself, so swapping in the
 * final HUD later means replacing this file without touching
 * useARNavigation or lib/arNavigation.
 */

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import type { ARNavigationState } from "@/hooks/useARNavigation"

export interface ARCameraViewProps {
  nav: ARNavigationState
  zoneName: string
  zoneEmoji: string
  zoneIndex: number
  zoneCount: number
  captionText: string
  narrating: boolean
  muted: boolean
  onToggleMute: () => void
  onArrive: () => void
  onRetryPermissions: () => void
  onExitLive: () => void
  arrived: boolean
}

export function ARCameraView({
  nav,
  zoneName,
  zoneEmoji,
  zoneIndex,
  zoneCount,
  captionText,
  narrating,
  muted,
  onToggleMute,
  onArrive,
  onRetryPermissions,
  onExitLive,
  arrived,
}: ARCameraViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (nav.cameraStream) {
      video.srcObject = nav.cameraStream
      void video.play().catch(() => {})
    } else {
      video.srcObject = null
    }
  }, [nav.cameraStream])

  const distanceLabel =
    nav.distanceMeters === null ? "—" : `${Math.round(nav.distanceMeters)}m`

  // Portal straight to <body>: AppShell's scroll container uses
  // -webkit-overflow-scrolling: touch, under which WebKit anchors
  // position:fixed descendants to the scrolled content instead of the
  // real viewport. Escaping the container avoids that entirely.
  if (typeof document === "undefined") return null

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        // Keep below 300+ so the Yatrik companion (draggable, rendered
        // above all app content per the PRD) can still float on top of
        // this view once it's wired in.
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        background: "#0F0B1E",
      }}
    >
      {/* TOP 25% — mission HUD */}
      <div
        style={{
          flex: "0 0 25%",
          minHeight: 140,
          background: "rgba(15,11,30,0.96)",
          borderBottom: "1px solid rgba(201,168,76,0.3)",
          padding: "16px 18px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={onExitLive}
            style={{
              background: "transparent",
              border: "1px solid rgba(201,168,76,0.4)",
              color: "#C9A84C",
              borderRadius: 10,
              padding: "4px 10px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ✕ Exit AR
          </button>
          <span style={{ color: "#C4A882", fontSize: 12 }}>
            Zone {zoneIndex + 1} / {zoneCount}
          </span>
          <button
            onClick={onToggleMute}
            aria-label={muted ? "Unmute narration" : "Mute narration"}
            style={{
              background: "transparent",
              border: "1px solid rgba(201,168,76,0.4)",
              color: "#C9A84C",
              borderRadius: 10,
              padding: "4px 10px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {muted ? "🔇" : narrating ? "🔊" : "🔈"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              flexShrink: 0,
              position: "relative",
            }}
          >
            <svg
              width="44"
              height="44"
              viewBox="0 0 44 44"
              style={{
                transform: `rotate(${nav.bearingDeg ?? 0}deg)`,
                transition: "transform 0.3s ease",
              }}
            >
              <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(201,168,76,0.35)" strokeWidth="2" />
              <polygon points="22,5 17,22 27,22" fill="#C9A84C" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#F5E6D3", fontFamily: "Georgia,serif", fontSize: 17, lineHeight: 1.2 }}>
              {zoneEmoji} {zoneName}
            </div>
            <div style={{ color: arrived ? "#4B9B8E" : "#C9A84C", fontSize: 13, fontWeight: 700 }}>
              {arrived ? "✅ You are here" : distanceLabel}
            </div>
          </div>
        </div>

        {captionText && (
          <div
            style={{
              background: "rgba(201,168,76,0.1)",
              borderLeft: "3px solid #C9A84C",
              borderRadius: 8,
              padding: "8px 10px",
              color: "#F5E6D3",
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            {captionText}
          </div>
        )}
      </div>

      {/* BOTTOM 75% — live camera + AR overlay */}
      <div style={{ position: "relative", flex: 1, overflow: "hidden", background: "#000" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />

        {/* Gold target reticle — on-screen when waypoint is in view */}
        {nav.waypoint.visible && nav.waypoint.screenX !== null && (
          <div
            style={{
              position: "absolute",
              top: "42%",
              left: `${50 + nav.waypoint.screenX * 40}%`,
              transform: "translate(-50%,-50%)",
              width: 84,
              height: 84,
              transition: "left 0.2s linear",
            }}
          >
            <svg width="84" height="84" viewBox="0 0 84 84">
              <circle
                cx="42"
                cy="42"
                r="34"
                fill="none"
                stroke={arrived ? "#4B9B8E" : "#C9A84C"}
                strokeWidth="3"
                strokeDasharray="6 6"
                style={{ animation: "ar-ring-spin 6s linear infinite" }}
              />
              <circle cx="42" cy="42" r="6" fill={arrived ? "#4B9B8E" : "#C9A84C"} />
            </svg>
          </div>
        )}

        {/* Edge-direction arrow — target is off screen */}
        {!nav.waypoint.visible && nav.waypoint.edgeDirection && (
          <div
            style={{
              position: "absolute",
              top: "45%",
              [nav.waypoint.edgeDirection === "left" ? "left" : "right"]: 16,
              transform: "translateY(-50%)",
              fontSize: 40,
              color: "#C9A84C",
              filter: "drop-shadow(0 0 6px rgba(201,168,76,0.7))",
              animation: "ar-arrow-pulse 1.2s ease-in-out infinite",
            }}
          >
            {nav.waypoint.edgeDirection === "left" ? "◀" : "▶"}
          </div>
        )}

        {/* Golden geofence ground plane hint */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: arrived ? 90 : 0,
            background: "linear-gradient(to top, rgba(201,168,76,0.35), transparent)",
            transition: "height 0.4s ease",
            pointerEvents: "none",
          }}
        />

        {/* Requesting overlay — shown while camera/location/compass prompts are pending */}
        {nav.mode === "requesting" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(15,11,30,0.88)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              textAlign: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "3px solid rgba(201,168,76,0.25)",
                borderTopColor: "#C9A84C",
                animation: "ar-ring-spin 0.9s linear infinite",
              }}
            />
            <p style={{ color: "#F5E6D3", fontSize: 14, lineHeight: 1.6 }}>
              Requesting camera, location, and compass access…
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#C4A882" }}>
              <span>📷 Camera: {nav.permissions.camera}</span>
              <span>📍 Location: {nav.permissions.location}</span>
              <span>🧭 Compass: {nav.permissions.orientation}</span>
            </div>
          </div>
        )}

        {/* Fallback overlay when a permission is missing */}
        {nav.mode === "fallback" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(15,11,30,0.92)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              textAlign: "center",
              gap: 16,
            }}
          >
            <p style={{ color: "#F5E6D3", fontSize: 15, lineHeight: 1.6 }}>
              {nav.fallbackReason ?? "Live AR isn't available right now."}
              <br />
              Switching to map-and-compass guidance.
            </p>
            <button
              onClick={onRetryPermissions}
              style={{
                background: "linear-gradient(135deg,#C9A84C,#D4893F)",
                borderRadius: 12,
                padding: "10px 24px",
                color: "#0F0B1E",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
              }}
            >
              🔄 Retry
            </button>
            <button
              onClick={onExitLive}
              style={{
                background: "transparent",
                border: "1px solid rgba(201,168,76,0.4)",
                borderRadius: 12,
                padding: "10px 24px",
                color: "#C9A84C",
                cursor: "pointer",
              }}
            >
              Use map instead
            </button>
          </div>
        )}

        {/* Arrival action */}
        {nav.mode === "live" && !arrived && (
          <button
            onClick={onArrive}
            disabled={!nav.arrivalUnlocked}
            style={{
              position: "absolute",
              bottom: 20,
              left: 20,
              right: 20,
              background: nav.arrivalUnlocked
                ? "linear-gradient(135deg,#4B9B8E,#3a7a6e)"
                : "rgba(75,155,142,0.25)",
              borderRadius: 16,
              padding: "16px 32px",
              color: "white",
              fontWeight: 700,
              fontSize: 17,
              border: "none",
              cursor: nav.arrivalUnlocked ? "pointer" : "default",
            }}
          >
            {nav.arrivalUnlocked ? "📍 I'm Here!" : `Get closer — ${distanceLabel} to go`}
          </button>
        )}
      </div>

      <style>{`
        @keyframes ar-ring-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ar-arrow-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>,
    document.body,
  )
}
