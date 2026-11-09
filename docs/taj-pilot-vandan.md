# Taj Mahal pilot: Vandan implementation and integration handoff

**Historical first-phase handoff.** Bhoomika’s implementation has since been
integrated; use [integrated delivery](taj-pilot-delivery.md) for current setup,
storage behaviour, acceptance evidence and limitations.

Implemented 9 November 2026. Local route: `/taj-pilot` in `apps/operations`.
This is Vandan's independently runnable module, not the completed joint release.

## Run

From the repository root, use Node 22.18+ and installed workspace dependencies:

```sh
npm run dev:operations
```

Open http://127.0.0.1:3100/taj-pilot. No credentials are needed for the mock
workspace. The production build can also serve this static demonstration using
`npm run start --workspace sanskriti-operations` after building.

## Delivered

- Server-side input adapter with source credential checks, server-derived site /
  zone / mode, strict input validation, freshness and ordering checks, harmless
  exact retries, conflicting retry rejection, and one authoritative source per zone.
- Pure crowd evaluator with injected clock, sustained breach, hysteresis,
  sustained recovery, and Unknown handling. Unknown clears pending duration
  timers while preserving an active condition until recovery can be verified.
- Three-zone dashboard, persistent mode badge, observations/source health,
  alert case UI, version-aware actions, required notes, and actor/time history.
- Real mode is a separate read-only readiness view: no live values, no writes,
  no demo reset, and no fallback to demo observations.
- Temporary browser-memory fixture repository and manual input controls for
  developing and checking Vandan's UI independently.

## Shared contract proposal: taj-pilot-v1

Source of truth: `apps/operations/lib/taj-pilot/contracts.ts`.
This version is ready for Bhoomika to review; no joint agreement is claimed.

- Zone IDs: `east-gate`, `main-gateway`, `mausoleum`; site ID: `taj-mahal`.
- Observation: `eventId`, `sourceId`, `sequence`, ISO `observedAt`,
  `health: online | offline`, `count`. Offline requires null; online requires
  a nonnegative safe integer. Site and mode fields are forbidden in input.
- Snapshot: site/mode/zone, estimated count, observation time, freshness,
  source health, calibration, and threshold status as defined in the type.
- AlertRepository: async `listAlerts()` and
  `applyAction(id, version, action) -> Alert`. Failed actions reject;
  stale versions reject. Alert history is authoritative in the repository.
- Actions: `assign`, `acknowledge`, `record-action`, `resolve`.
  The mock accepts only `demo-staff-1` and attributes all actors as simulated.
  Resolve requires an action note, a resolution note and verified mock recovery.
- Rule evaluation: `evaluate(snapshot, config, clockMs, previousState)`.
  The caller retains rule state per zone and prevents duplicate open cases.
  Recovery never resolves staff workflow automatically.
- Demo values: breach >=100 for 30 seconds; recovery <=70 for 20 seconds;
  stale after 60 seconds. Demo clock starts at `2026-11-09T09:00:00Z`.
  These are illustrative, not site-approved capacity limits.

## Bhoomika integration points

1. Import the shared contract instead of creating alternate event/alert shapes.
2. Replace `MockWorkspace` in `app/taj-pilot/taj-pilot.tsx` with her scenario
   controller / demo repository. The exported `AlertPanel` accepts an
   `AlertRepository`, alerts and an async refresh callback.
3. Supply normalized snapshots and keep the same controlled clock for scenario
   playback, evaluation and action history. Evaluate every observation and
   clock advance, including unknown states. Never aggregate overlapping sources.
4. Keep one open case per zone/rule; update condition separately from case status.
   Record scenario-generated case creation in the demo store.
5. Reset only her demo workspace, plus per-zone evaluator state and clock.
   Unmount/reset pending note forms when replacing the workspace.
6. Add her six named scenarios, advisory preview, acceptance evidence and recording.
7. Run the joint journey twice, compare outcomes, then finalize the contract.

The temporary mock is deliberately not a replacement for her persistent demo
store, scenario player, advisory templates or acceptance harness. Reload clears
its state. Scenario controls use manual fixed observations, not live sampling.

## Adapter boundary and real activation

`input-adapter.ts` is Node/server-only and is not imported by the browser.
Each instance has an explicit site/mode scope and its own in-memory event ledger.
The test suite uses a labelled synthetic source in a `test` workspace, including
cross-site and cross-mode rejection. Credentials in tests are fixtures only.

There is no network ingestion endpoint or real repository wired to this pilot.
Do not expose this in-memory adapter as production ingestion: registration and
credentials must come from a protected service registry, and idempotency/order
state must be transactional, durable, retention-bounded and safe across workers.
Existing production staff/database controls have not been verified for pilot
writes. The real view stays disconnected and actions remain unavailable.

Before activation: site permission, authorized source credentials, verified
coverage/calibration, approved thresholds, verified site/role enforcement and
storage/retention, manual-count comparison, silent trial and acceptance.
No deployment, database migration, public notification or live-source connection
was performed for this work.

## Checks and manual rehearsal

```sh
npm run test:operations
npm run typecheck:operations
npm run build:operations
```

1. High input on East Gate; advance 10 seconds three times. One case appears.
2. Assign simulated staff, acknowledge, enter a note, record the action.
3. Normal input on East Gate; advance 10 seconds twice. Crowd recovers; case stays open.
4. Enter resolution note and resolve. Expand history to inspect all five entries.
5. Set Offline; verify Unknown. Switch to real mode; verify no live count or reset.
6. Return to demo and reset. Let readings go stale; all three zones show Unknown.

Automated checks cover input rejection/authentication, retries, stale readings,
coverage conflicts, sustained rules, Unknown interruption, workflow/version/note
requirements and repeatable reset. Existing operations checks are also run.

### Verification result, 9 November 2026

- Operations suite: 35/35 tests passed (29 existing plus 6 pilot tests).
- TypeScript check and production build passed; `/taj-pilot` is generated.
- Headless browser against the production build: complete staff journey and
  five-entry history, recovery without automatic resolution, offline, stale,
  reset and real-mode separation passed with no browser errors.
- Desktop (1440px) and mobile (390px) screenshots reviewed; no horizontal
  overflow at the mobile viewport.
- `git diff --check` passed. Existing unrelated edits were not changed.
