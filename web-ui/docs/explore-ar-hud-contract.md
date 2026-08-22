# Explore AR HUD visual contract

`ExploreARHud` is presentation-only. It does not request permissions, open the camera, watch GPS, read device orientation, calculate geofences, award XP, or advance routes. Parth's controller supplies neutral state and the existing Explore page owns product actions.

## Screen composition

- Top 25%: mission HUD with monument/zone, distance, compact compass, progress, mute, and status.
- Bottom 75%: camera layer with gold geofence, target reticle or edge arrow, Yatrik caption, and arrival action.
- Demo mode is always labelled `Demo · Synthetic GPS` and must never resemble live positioning.
- Permission/sensor failure replaces AR treatment with an explicit map-fallback card.

## State interface

The source of truth lives in `components/explore/explore-ar-hud.tsx` as `ExploreARHudState`.

Required fields:

- `activeZone`: display name, emoji, geofence radius, and XP.
- `distanceMeters` and `bearingDegrees`: controller-calculated navigation values.
- `targetVisible`: switches between the centre reticle and edge arrow.
- `arrivalStatus`: `approaching`, `inside`, or `arrived`.
- `narrationStatus`: `idle`, `loading`, `speaking`, or `ready`.
- `fallbackStatus`: no fallback, camera denied, location denied, or orientation unavailable.
- `mode`: live, visibly synthetic demo, or map fallback.
- `caption`, optional story/mini-fact, and route progress.

## Controller handoff rules

- Bearing is degrees clockwise from north, normalized by the HUD.
- Distance is a rounded non-negative metre value.
- `targetVisible` comes from screen-space projection; the HUD never guesses it in live mode.
- `inside` comes only from live geofence validation; the HUD enables arrival from this state.
- Demo mode may enable arrival independently, but remains labelled at all times.
- Raw camera frames, GPS tracks, headings, and sensor history never enter component props or persistence.
