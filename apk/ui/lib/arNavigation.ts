export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_METERS = 6371000

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Great-circle distance between two coordinates, in meters. */
export function distanceMeters(from: LatLng, to: LatLng): number {
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_METERS * c
}

/** Compass bearing (0-360, 0 = north) from one coordinate to another. */
export function bearingDegrees(from: LatLng, to: LatLng): number {
  const dLng = toRad(to.lng - from.lng)
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360
}

/** Normalizes an angle difference (a - b) into the range -180..180. */
export function angleDiffDegrees(a: number, b: number): number {
  return (((a - b + 540) % 360) + 360) % 360 - 180
}

export interface WaypointProjection {
  /** True when the target falls within the camera's horizontal field of view. */
  visible: boolean
  /** Normalized horizontal screen position (-1 = left edge, 0 = center, 1 = right edge). Only set when visible. */
  screenX: number | null
  /** Which side of the screen the target lies toward, for the off-screen edge arrow. */
  edgeDirection: 'left' | 'right' | null
  /** Signed angle (deg) between the device heading and the target bearing, -180..180. */
  relativeAngle: number
}

/**
 * Projects a target bearing into screen space given the device's current
 * compass heading and the camera's horizontal field of view. Pure function,
 * no DOM/browser API access, so it is trivially unit-testable and has no
 * dependency on final HUD styling.
 */
export function projectWaypoint(
  bearing: number,
  heading: number,
  cameraFovDeg: number,
): WaypointProjection {
  const relativeAngle = angleDiffDegrees(bearing, heading)
  const halfFov = cameraFovDeg / 2

  if (Math.abs(relativeAngle) <= halfFov) {
    return {
      visible: true,
      screenX: relativeAngle / halfFov,
      edgeDirection: null,
      relativeAngle,
    }
  }

  return {
    visible: false,
    screenX: null,
    edgeDirection: relativeAngle > 0 ? 'right' : 'left',
    relativeAngle,
  }
}

/** Whether the user's current position is inside the zone's geofence radius. */
export function isInsideGeofence(
  userPos: LatLng,
  zone: LatLng & { radius: number },
  graceMeters = 0,
): boolean {
  return distanceMeters(userPos, zone) <= zone.radius + graceMeters
}

export const DEFAULT_CAMERA_FOV_DEG = 65
