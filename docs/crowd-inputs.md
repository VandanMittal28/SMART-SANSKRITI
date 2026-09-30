# Crowd input contract (local sandbox)

The second operations milestone adds a working, persisted input-processing
pipeline. It is testable through the Zone crowd simulator and `POST /api/crowd`.
It is not yet connected to real visitor devices or camera gateways.

## Mode and storage

The first observation replaces canned crowd signals with an initially empty
simulation. It preserves incident records. Existing schema-v1 workspaces remain
readable: the optional `crowdInputs` field is created only on the first input.
“Replay sample readings” returns to canned examples and discards simulated
presence/camera inputs, without resetting incidents.

Only aggregate projections are sent back by the workspace API. Individual
anonymous session IDs stay in the local input store. The 2,000-session bound is
for this local simulator, not a production retention/scaling design.

## Presence

```json
{
  "kind": "presence",
  "sessionId": "ce10208f-2092-4b0e-9092-4e15e0400000",
  "sequence": 1,
  "observedAt": "2026-09-30T10:00:00.000Z",
  "consent": true,
  "zoneId": "entrance"
}
```

Use a fresh timestamp when trying this example. Observations older than five
minutes or over 30 seconds in the future are rejected. A session is counted in
one zone only; a newer heartbeat moves it. Each session expires independently
after five minutes. An exact retry is ignored. An older sequence/timestamp or
conflicting retry fails with 409. Producers must persist increasing sequences.

To withdraw: send a higher sequence with `consent: false` and `zoneId: null`.
The last location is removed immediately; the sequence tombstone prevents an
old heartbeat from resurrecting the presence. No precise coordinates, names
or device identifiers are accepted. A future real client must obtain actual
consent and determine zones before using this contract; a request flag alone
does not establish that consent was meaningfully obtained.

## Cameras

```json
{
  "kind": "camera",
  "cameraId": "entrance-01",
  "sequence": 1,
  "observedAt": "2026-09-30T10:00:00.000Z",
  "health": "online",
  "count": 178
}
```

Registered sample sources are `entrance-01`, `garden-01`, `gallery-01` and
`courtyard-01`. One source is canonical per zone, so overlapping cameras are
not summed. The courtyard source is deliberately uncalibrated. Unknown source
IDs, negative/non-integral counts, invalid timestamps and extra fields fail
validation. Offline input uses `health: offline` and `count: null`.

Fresh, calibrated camera counts provide the zone estimate. App counts remain
a separate partial sample. Uncalibrated/offline/stale sources yield unknown
occupancy. A zero app count never proves an empty zone. The API computes expiry
on each read; the visible simulator polls every 30 seconds.

## Before connecting real inputs

Add authenticated producer credentials, site-scoped source registration,
rate limits, transactional persistence, retention/deletion and monitoring.
Calibrate camera overlap and count error, implement actual consent collection
and zone-boundary logic, and validate stale/offline behavior at the site.
Entry/exit integration, sustained-threshold alerts and safe-route suggestions
remain unimplemented. Do not publish the localhost sandbox to receive devices.
