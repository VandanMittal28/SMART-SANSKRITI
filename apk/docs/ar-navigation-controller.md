# Native AR navigation controller contract

The APK exposes a presentation-neutral Android navigation engine through
`window.SanskritiAndroidAR`. The engine has no dependency on Yatrik artwork or
HUD styling and does not award XP, mark an arrival complete, or advance a route.
Those product actions remain owned by the existing Explore screen.

## Start and lifecycle

```js
window.SanskritiAndroidAR.start({
  lat: 27.1751,
  lng: 78.0421,
  radius: 40,
  cameraFovDeg: 65,
  geofenceGraceMeters: 0,
})

window.SanskritiAndroidAR.retry()
window.SanskritiAndroidAR.stop()
const latest = window.SanskritiAndroidAR.getState()
```

Starting requests camera and location permissions just in time. Android owns
the GPS and compass watches and pauses them when the activity backgrounds. It
restores active watches on foreground and releases all listeners on stop or
activity destruction. Rear-camera availability is validated natively; the
existing WebView camera permission path remains responsible for displaying the
actual camera frames.

## State events

Every material update dispatches `sanskriti-ar-navigation-state` on `window`.
The event `detail` has this stable shape:

```ts
type NativeArState = {
  mode: 'idle' | 'requesting' | 'live' | 'fallback'
  permissions: {
    camera: 'unrequested' | 'requesting' | 'granted' | 'denied' | 'unavailable'
    location: 'unrequested' | 'requesting' | 'granted' | 'denied' | 'unavailable'
    orientation: 'unrequested' | 'requesting' | 'granted' | 'denied' | 'unavailable'
  }
  fallbackReason: string | null
  headingDeg: number | null
  bearingDeg: number | null
  distanceMeters: number | null
  waypoint: {
    visible: boolean
    screenX: number | null
    edgeDirection: 'left' | 'right' | null
    relativeAngle: number
  }
  arrivalUnlocked: boolean
  tracking: boolean
  updatedAt: number
}
```

`sanskriti-ar-navigation-ready` announces that the bridge is installed after a
trusted app page loads. Invalid targets dispatch
`sanskriti-ar-navigation-error` with a human-readable `message`.

## Privacy and reliability

- Camera frames never enter the controller and are not stored.
- Only the latest GPS and sensor samples exist in memory; no track or heading
  history is persisted.
- Raw latitude/longitude and sensor values are not exposed in state events.
- Location and orientation have bounded startup timeouts. Missing permission,
  disabled services, absent rear camera, or absent compass produce an explicit
  fallback state.
- Heading is smoothed across the north crossing and state updates are throttled
  to avoid a sensor-rate rendering storm.
