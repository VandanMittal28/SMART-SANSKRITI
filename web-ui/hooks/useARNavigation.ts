"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  DEFAULT_CAMERA_FOV_DEG,
  angleDiffDegrees,
  bearingDegrees,
  distanceMeters,
  isInsideGeofence,
  projectWaypoint,
  type LatLng,
  type WaypointProjection,
} from "@/lib/arNavigation"

/** Minimum time between heading state updates, to avoid re-rendering on every ~16ms sensor tick. */
const HEADING_THROTTLE_MS = 80
/** Minimum heading change (degrees) required to bother re-rendering. */
const HEADING_MIN_DELTA_DEG = 1

export interface ARNavigationZone extends LatLng {
  radius: number
}

export type ARPermissionState =
  | "unrequested"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable"

export interface ARPermissionStatus {
  camera: ARPermissionState
  location: ARPermissionState
  orientation: ARPermissionState
}

export type ARNavigationMode = "idle" | "requesting" | "live" | "fallback" | "demo"

export interface ARNavigationState {
  mode: ARNavigationMode
  permissions: ARPermissionStatus
  fallbackReason: string | null
  cameraStream: MediaStream | null
  userPosition: LatLng | null
  headingDeg: number | null
  bearingDeg: number | null
  distanceMeters: number | null
  waypoint: WaypointProjection
  arrivalUnlocked: boolean
}

export interface UseARNavigationOptions {
  zone: ARNavigationZone | null
  /** Explicit, clearly-labeled synthetic mode. Skips all permission requests. */
  demoMode?: boolean
  cameraFovDeg?: number
  geofenceGraceMeters?: number
}

const IDLE_WAYPOINT: WaypointProjection = {
  visible: false,
  screenX: null,
  edgeDirection: null,
  relativeAngle: 0,
}

const IDLE_PERMISSIONS: ARPermissionStatus = {
  camera: "unrequested",
  location: "unrequested",
  orientation: "unrequested",
}

function permissionsBlockLive(permissions: ARPermissionStatus): string | null {
  if (permissions.camera === "denied") return "Camera access was denied."
  if (permissions.camera === "unavailable") return "No camera is available on this device."
  if (permissions.location === "denied") return "Location access was denied."
  if (permissions.location === "unavailable") return "Location services are unavailable."
  if (permissions.orientation === "denied") return "Compass access was denied."
  if (permissions.orientation === "unavailable") return "This device has no compass sensor."
  return null
}

/**
 * Owns camera stream lifecycle, GPS watch, device heading, geofence
 * calculation, and screen-space waypoint projection. Exposes typed
 * navigation state only — it renders nothing and has no dependency on
 * mascot art or HUD styling, so the presentation layer can be swapped
 * freely once the final HUD design lands.
 */
export function useARNavigation({
  zone,
  demoMode = false,
  cameraFovDeg = DEFAULT_CAMERA_FOV_DEG,
  geofenceGraceMeters = 0,
}: UseARNavigationOptions) {
  const [permissions, setPermissions] = useState<ARPermissionStatus>(IDLE_PERMISSIONS)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [userPosition, setUserPosition] = useState<LatLng | null>(null)
  const [headingDeg, setHeadingDeg] = useState<number | null>(null)
  const [engaged, setEngaged] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const orientationHandlerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null)
  const lastHeadingValueRef = useRef<number | null>(null)
  const lastHeadingUpdateRef = useRef(0)

  // Bumped on every teardown/retry so async permission requests that
  // resolve after being superseded (or after unmount) can detect it and
  // discard their result instead of leaking a camera stream or writing
  // stale state.
  const generationRef = useRef(0)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraStream(null)
  }, [])

  const stopLocationWatch = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const stopOrientationWatch = useCallback(() => {
    if (orientationHandlerRef.current && typeof window !== "undefined") {
      window.removeEventListener("deviceorientationabsolute", orientationHandlerRef.current as EventListener)
      window.removeEventListener("deviceorientation", orientationHandlerRef.current as EventListener)
      orientationHandlerRef.current = null
    }
    lastHeadingValueRef.current = null
    lastHeadingUpdateRef.current = 0
  }, [])

  const teardown = useCallback(() => {
    generationRef.current += 1
    stopCamera()
    stopLocationWatch()
    stopOrientationWatch()
  }, [stopCamera, stopLocationWatch, stopOrientationWatch])

  useEffect(() => () => teardown(), [teardown])

  const startLocationWatch = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermissions((prev) => ({ ...prev, location: "unavailable" }))
      return
    }
    setPermissions((prev) => ({ ...prev, location: "requesting" }))
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setPermissions((prev) => ({ ...prev, location: "granted" }))
        setUserPosition({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      (error) => {
        setPermissions((prev) => ({
          ...prev,
          location: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        }))
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    )
  }, [])

  const startOrientationWatch = useCallback(async () => {
    if (typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") {
      setPermissions((prev) => ({ ...prev, orientation: "unavailable" }))
      return
    }

    const generation = generationRef.current
    setPermissions((prev) => ({ ...prev, orientation: "requesting" }))

    const requestPermission = (DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">
    }).requestPermission

    if (typeof requestPermission === "function") {
      try {
        const result = await requestPermission()
        if (generationRef.current !== generation) return
        if (result !== "granted") {
          setPermissions((prev) => ({ ...prev, orientation: "denied" }))
          return
        }
      } catch {
        if (generationRef.current !== generation) return
        setPermissions((prev) => ({ ...prev, orientation: "denied" }))
        return
      }
    }

    if (generationRef.current !== generation) return

    let receivedReading = false
    const handler = (event: DeviceOrientationEvent) => {
      const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
      const heading = typeof webkitHeading === "number"
        ? webkitHeading
        : event.alpha !== null && event.alpha !== undefined
          ? (360 - event.alpha) % 360
          : null

      if (heading === null) return
      if (!receivedReading) {
        receivedReading = true
        setPermissions((prev) => ({ ...prev, orientation: "granted" }))
        lastHeadingValueRef.current = heading
        lastHeadingUpdateRef.current = performance.now()
        setHeadingDeg(heading)
        return
      }

      const now = performance.now()
      const prevHeading = lastHeadingValueRef.current
      const movedEnough = prevHeading === null || Math.abs(angleDiffDegrees(heading, prevHeading)) >= HEADING_MIN_DELTA_DEG
      const dueForUpdate = now - lastHeadingUpdateRef.current >= HEADING_THROTTLE_MS
      if (movedEnough && dueForUpdate) {
        lastHeadingValueRef.current = heading
        lastHeadingUpdateRef.current = now
        setHeadingDeg(heading)
      }
    }

    orientationHandlerRef.current = handler
    window.addEventListener("deviceorientationabsolute", handler as EventListener)
    window.addEventListener("deviceorientation", handler as EventListener)

    // Some browsers never fire the event when no compass sensor exists.
    window.setTimeout(() => {
      if (generationRef.current !== generation) return
      if (!receivedReading) {
        setPermissions((prev) =>
          prev.orientation === "requesting" ? { ...prev, orientation: "unavailable" } : prev,
        )
      }
    }, 4000)
  }, [])

  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPermissions((prev) => ({ ...prev, camera: "unavailable" }))
      return
    }
    const generation = generationRef.current
    setPermissions((prev) => ({ ...prev, camera: "requesting" }))
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      if (generationRef.current !== generation) {
        // Superseded by a retry/exit/unmount while the prompt was open —
        // don't resurrect a stream nobody will render or stop.
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      setCameraStream(stream)
      setPermissions((prev) => ({ ...prev, camera: "granted" }))
    } catch (error) {
      if (generationRef.current !== generation) return
      const name = error instanceof DOMException ? error.name : ""
      setPermissions((prev) => ({
        ...prev,
        camera: name === "NotFoundError" ? "unavailable" : "denied",
      }))
    }
  }, [])

  const requestPermissions = useCallback(async () => {
    if (demoMode) return
    teardown()
    setEngaged(true)
    startLocationWatch()
    await Promise.all([startCamera(), startOrientationWatch()])
  }, [demoMode, startCamera, startLocationWatch, startOrientationWatch, teardown])

  const retry = useCallback(() => {
    setPermissions(IDLE_PERMISSIONS)
    void requestPermissions()
  }, [requestPermissions])

  // Camera frames, raw GPS tracks, and orientation readings are kept only
  // as the latest in-memory sample above — nothing here is persisted.
  const bearing = zone && userPosition ? bearingDegrees(userPosition, zone) : null
  const distance = zone && userPosition ? distanceMeters(userPosition, zone) : null
  const waypoint =
    bearing !== null && headingDeg !== null
      ? projectWaypoint(bearing, headingDeg, cameraFovDeg)
      : IDLE_WAYPOINT
  const arrivalUnlocked =
    !demoMode && zone !== null && userPosition !== null
      ? isInsideGeofence(userPosition, zone, geofenceGraceMeters)
      : false

  const fallbackReason = demoMode ? null : engaged ? permissionsBlockLive(permissions) : null

  let mode: ARNavigationMode = "idle"
  if (demoMode) mode = "demo"
  else if (!engaged) mode = "idle"
  else if (fallbackReason) mode = "fallback"
  else if (permissions.camera === "granted" && permissions.location === "granted" && permissions.orientation === "granted") {
    mode = "live"
  } else {
    mode = "requesting"
  }

  const state: ARNavigationState = {
    mode,
    permissions,
    fallbackReason,
    cameraStream,
    userPosition,
    headingDeg,
    bearingDeg: bearing,
    distanceMeters: distance,
    waypoint,
    arrivalUnlocked,
  }

  return { ...state, requestPermissions, retry, stop: teardown }
}
