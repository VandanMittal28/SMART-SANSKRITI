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

/** Minimum time between browser heading updates. Native updates are already throttled. */
const HEADING_THROTTLE_MS = 80
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
  /** Explicit, clearly-labelled synthetic mode. Skips all permission requests. */
  demoMode?: boolean
  cameraFovDeg?: number
  geofenceGraceMeters?: number
}

interface NativeARNavigationState {
  mode: "idle" | "requesting" | "live" | "fallback"
  permissions: ARPermissionStatus
  fallbackReason: string | null
  userPosition: LatLng | null
  headingDeg: number | null
  bearingDeg: number | null
  distanceMeters: number | null
  waypoint: WaypointProjection
  arrivalUnlocked: boolean
  tracking: boolean
  updatedAt: number
}

interface NativeARNavigationBridge {
  start: (target: {
    lat: number
    lng: number
    radius: number
    cameraFovDeg: number
    geofenceGraceMeters: number
  }) => void
  retry: () => void
  stop: () => void
  getState: () => NativeARNavigationState
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

function getNativeBridge(): NativeARNavigationBridge | null {
  if (typeof window === "undefined") return null
  return (window as typeof window & {
    SanskritiAndroidAR?: NativeARNavigationBridge
  }).SanskritiAndroidAR ?? null
}

function isNativeState(value: unknown): value is NativeARNavigationState {
  if (!value || typeof value !== "object") return false
  const state = value as Partial<NativeARNavigationState>
  return (
    ["idle", "requesting", "live", "fallback"].includes(state.mode ?? "") &&
    Boolean(state.permissions) &&
    Boolean(state.waypoint)
  )
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
 * APK navigation adapter. In the bundled Android app, native Android owns GPS,
 * heading, bearing, projection, geofence, and lifecycle state while WebView
 * owns only the camera MediaStream rendered by the HUD. Outside the APK, the
 * original browser implementation remains available for development fallback.
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
  const [nativeActive, setNativeActive] = useState(false)
  const [nativeState, setNativeState] = useState<NativeARNavigationState | null>(null)

  const zoneLatitude = zone?.lat
  const zoneLongitude = zone?.lng
  const zoneRadius = zone?.radius

  const streamRef = useRef<MediaStream | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const orientationHandlerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null)
  const lastHeadingValueRef = useRef<number | null>(null)
  const lastHeadingUpdateRef = useRef(0)
  const generationRef = useRef(0)
  const nativeModeRef = useRef(false)
  const nativeCameraAttemptedRef = useRef(false)
  const nativeTargetKeyRef = useRef("")

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
    if (nativeModeRef.current) getNativeBridge()?.stop()
    nativeModeRef.current = false
    nativeTargetKeyRef.current = ""
    nativeCameraAttemptedRef.current = false
    setNativeActive(false)
    setNativeState(null)
    stopCamera()
    stopLocationWatch()
    stopOrientationWatch()
  }, [stopCamera, stopLocationWatch, stopOrientationWatch])

  const stop = useCallback(() => {
    teardown()
    setEngaged(false)
    setPermissions(IDLE_PERMISSIONS)
    setUserPosition(null)
    setHeadingDeg(null)
  }, [teardown])

  useEffect(() => () => teardown(), [teardown])

  useEffect(() => {
    const receiveNativeState = (event: Event) => {
      if (!nativeModeRef.current) return
      const detail = (event as CustomEvent<unknown>).detail
      if (isNativeState(detail)) setNativeState(detail)
    }
    window.addEventListener("sanskriti-ar-navigation-state", receiveNativeState)
    return () => window.removeEventListener("sanskriti-ar-navigation-state", receiveNativeState)
  }, [])

  const startLocationWatch = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermissions((previous) => ({ ...previous, location: "unavailable" }))
      return
    }
    setPermissions((previous) => ({ ...previous, location: "requesting" }))
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setPermissions((previous) => ({ ...previous, location: "granted" }))
        setUserPosition({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      (error) => {
        setPermissions((previous) => ({
          ...previous,
          location: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        }))
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    )
  }, [])

  const startOrientationWatch = useCallback(async () => {
    if (orientationHandlerRef.current) return
    if (typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") {
      setPermissions((previous) => ({ ...previous, orientation: "unavailable" }))
      return
    }

    const generation = generationRef.current
    setPermissions((previous) => ({ ...previous, orientation: "requesting" }))
    const requestPermission = (DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">
    }).requestPermission

    if (typeof requestPermission === "function") {
      try {
        const result = await requestPermission()
        if (generationRef.current !== generation) return
        if (result !== "granted") {
          setPermissions((previous) => ({ ...previous, orientation: "denied" }))
          return
        }
      } catch {
        if (generationRef.current !== generation) return
        setPermissions((previous) => ({ ...previous, orientation: "denied" }))
        return
      }
    }

    if (generationRef.current !== generation) return
    let receivedReading = false
    const handler = (event: DeviceOrientationEvent) => {
      const webkitHeading = (event as DeviceOrientationEvent & {
        webkitCompassHeading?: number
      }).webkitCompassHeading
      const heading = typeof webkitHeading === "number"
        ? webkitHeading
        : event.alpha !== null && event.alpha !== undefined
          ? (360 - event.alpha) % 360
          : null

      if (heading === null) return
      if (!receivedReading) {
        receivedReading = true
        setPermissions((previous) => ({ ...previous, orientation: "granted" }))
        lastHeadingValueRef.current = heading
        lastHeadingUpdateRef.current = performance.now()
        setHeadingDeg(heading)
        return
      }

      const now = performance.now()
      const previousHeading = lastHeadingValueRef.current
      const movedEnough = previousHeading === null || Math.abs(
        angleDiffDegrees(heading, previousHeading),
      ) >= HEADING_MIN_DELTA_DEG
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
    window.setTimeout(() => {
      if (generationRef.current !== generation || receivedReading) return
      setPermissions((previous) => previous.orientation === "requesting"
        ? { ...previous, orientation: "unavailable" }
        : previous)
    }, 4000)
  }, [])

  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPermissions((previous) => ({ ...previous, camera: "unavailable" }))
      return
    }
    const generation = generationRef.current
    setPermissions((previous) => ({ ...previous, camera: "requesting" }))
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      if (generationRef.current !== generation) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      setCameraStream(stream)
      setPermissions((previous) => ({ ...previous, camera: "granted" }))
    } catch (error) {
      if (generationRef.current !== generation) return
      const name = error instanceof DOMException ? error.name : ""
      setPermissions((previous) => ({
        ...previous,
        camera: name === "NotFoundError" ? "unavailable" : "denied",
      }))
    }
  }, [])

  const requestCameraPreview = useCallback(async () => {
    await Promise.all([
      streamRef.current ? Promise.resolve() : startCamera(),
      startOrientationWatch(),
    ])
  }, [startCamera, startOrientationWatch])

  const stopCameraPreview = useCallback(() => {
    stopCamera()
    stopOrientationWatch()
    setPermissions((previous) => ({
      ...previous,
      camera: "unrequested",
      orientation: "unrequested",
    }))
    setHeadingDeg(null)
  }, [stopCamera, stopOrientationWatch])

  useEffect(() => {
    if (
      !nativeActive ||
      nativeState?.permissions.camera !== "granted" ||
      nativeCameraAttemptedRef.current
    ) return
    nativeCameraAttemptedRef.current = true
    void startCamera()
  }, [nativeActive, nativeState?.permissions.camera, startCamera])

  const requestPermissions = useCallback(async () => {
    if (
      demoMode ||
      zoneLatitude === undefined ||
      zoneLongitude === undefined ||
      zoneRadius === undefined
    ) return
    teardown()
    setEngaged(true)

    const nativeBridge = getNativeBridge()
    if (nativeBridge) {
      nativeModeRef.current = true
      setNativeActive(true)
      nativeCameraAttemptedRef.current = false
      setPermissions({
        camera: "unrequested",
        location: "requesting",
        orientation: "requesting",
      })
      const initialState = nativeBridge.getState()
      setNativeState(isNativeState(initialState) ? initialState : null)
      const targetKey = `${zoneLatitude}:${zoneLongitude}:${zoneRadius}:${cameraFovDeg}:${geofenceGraceMeters}`
      nativeTargetKeyRef.current = targetKey
      nativeBridge.start({
        lat: zoneLatitude,
        lng: zoneLongitude,
        radius: zoneRadius,
        cameraFovDeg,
        geofenceGraceMeters,
      })
      return
    }

    startLocationWatch()
    await Promise.all([startCamera(), startOrientationWatch()])
  }, [
    cameraFovDeg,
    demoMode,
    geofenceGraceMeters,
    startCamera,
    startLocationWatch,
    startOrientationWatch,
    teardown,
    zoneLatitude,
    zoneLongitude,
    zoneRadius,
  ])

  const retry = useCallback(() => {
    if (nativeModeRef.current) {
      stopCamera()
      nativeCameraAttemptedRef.current = false
      setPermissions((previous) => ({ ...previous, camera: "unrequested" }))
      getNativeBridge()?.retry()
      return
    }
    setPermissions(IDLE_PERMISSIONS)
    void requestPermissions()
  }, [requestPermissions, stopCamera])

  useEffect(() => {
    if (
      !nativeActive ||
      zoneLatitude === undefined ||
      zoneLongitude === undefined ||
      zoneRadius === undefined
    ) return
    const targetKey = `${zoneLatitude}:${zoneLongitude}:${zoneRadius}:${cameraFovDeg}:${geofenceGraceMeters}`
    if (nativeTargetKeyRef.current === targetKey) return
    nativeTargetKeyRef.current = targetKey
    getNativeBridge()?.start({
      lat: zoneLatitude,
      lng: zoneLongitude,
      radius: zoneRadius,
      cameraFovDeg,
      geofenceGraceMeters,
    })
  }, [cameraFovDeg, geofenceGraceMeters, nativeActive, zoneLatitude, zoneLongitude, zoneRadius])

  if (demoMode) {
    return {
      mode: "demo" as const,
      permissions: IDLE_PERMISSIONS,
      fallbackReason: null,
      cameraStream: null,
      userPosition: null,
      headingDeg: null,
      bearingDeg: null,
      distanceMeters: null,
      waypoint: IDLE_WAYPOINT,
      arrivalUnlocked: false,
      requestPermissions,
      requestCameraPreview,
      retry,
      stop,
      stopCameraPreview,
    }
  }

  if (nativeActive) {
    const combinedPermissions: ARPermissionStatus = {
      camera: nativeState?.permissions.camera === "granted"
        ? permissions.camera
        : nativeState?.permissions.camera ?? permissions.camera,
      location: nativeState?.permissions.location ?? "requesting",
      orientation: nativeState?.permissions.orientation ?? "requesting",
    }
    const fallbackReason = permissionsBlockLive(combinedPermissions)
      ?? nativeState?.fallbackReason
      ?? null
    const mode: ARNavigationMode = !engaged
      ? "idle"
      : fallbackReason
        ? "fallback"
        : nativeState?.mode === "live" && cameraStream
          ? "live"
          : "requesting"

    return {
      mode,
      permissions: combinedPermissions,
      fallbackReason,
      cameraStream,
      userPosition: nativeState?.userPosition ?? null,
      headingDeg: nativeState?.headingDeg ?? null,
      bearingDeg: nativeState?.bearingDeg ?? null,
      distanceMeters: nativeState?.distanceMeters ?? null,
      waypoint: nativeState?.waypoint ?? IDLE_WAYPOINT,
      arrivalUnlocked: mode === "live" && Boolean(nativeState?.arrivalUnlocked),
      requestPermissions,
      requestCameraPreview,
      retry,
      stop,
      stopCameraPreview,
    }
  }

  const bearing = zone && userPosition ? bearingDegrees(userPosition, zone) : null
  const distance = zone && userPosition ? distanceMeters(userPosition, zone) : null
  const waypoint = bearing !== null && headingDeg !== null
    ? projectWaypoint(bearing, headingDeg, cameraFovDeg)
    : IDLE_WAYPOINT
  const arrivalUnlocked = engaged && zone !== null && userPosition !== null
    ? isInsideGeofence(userPosition, zone, geofenceGraceMeters)
    : false
  const fallbackReason = engaged ? permissionsBlockLive(permissions) : null
  const mode: ARNavigationMode = !engaged
    ? "idle"
    : fallbackReason
      ? "fallback"
      : permissions.camera === "granted" &&
          permissions.location === "granted" &&
          permissions.orientation === "granted"
        ? "live"
        : "requesting"

  return {
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
    requestPermissions,
    requestCameraPreview,
    retry,
    stop,
    stopCameraPreview,
  }
}
