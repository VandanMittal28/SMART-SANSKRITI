# Taj Mahal pilot — integrated delivery

Implemented locally on 9 November 2026. Includes Vandan's dashboard/input/rules
and Bhoomika's scenarios, demo repository, preview and acceptance harness.

## Open and run

Requires Node 22.18+ and npm. From the repository root:

```sh
npm ci
npm run dev:operations
```

Open http://127.0.0.1:3100/taj-pilot. No credentials are required for the demo.
For a production-build local preview, stop the development server and run:

```sh
npm run build:operations
npm run start --workspace sanskriti-operations
```

No environment variables or external services are needed for this demo.
There is no production ingestion endpoint and no live deployment in this handoff.

## Demonstration

1. Choose **Reset**, then **Normal**, **Rising queue**, **Congestion**.
   Congestion advances the demo clock by 30 seconds and creates one open case.
2. Assign simulated staff, acknowledge, write a note and record the action.
3. Generate the East Gate preview. English and Hindi text, simulation label,
   approval status and expiry are shown. Nothing is sent publicly.
4. Choose **Recovery**. The clock advances by 20 seconds; the case remains open.
   Write a resolution note and resolve. Expand the five-entry history.
5. Choose **Offline**. East Gate becomes Unknown and crowd advice is suppressed.
6. Open real-world readiness: counts remain Unknown, source Not connected, and
   staff actions disabled. Return to demo and reset.

Run this sequence again to reproduce the same event times and history.
**Advance 10 seconds** controls time manually; **Let readings go stale** expires
readings. Scenario buttons apply fixed steps to the current demo. Reset starts
an independent rehearsal; Recovery intentionally preserves staff workflow.

## Storage and failure behaviour

The demo repository implements the shared AlertRepository contract and saves a
versioned, validated command journal in browser localStorage under
`sanskriti: taj-pilot:demo:v1`. Reload replays the journal with the same controlled
clock. The repository validates and applies a candidate before committing it;
failed writes leave displayed state and previous storage unchanged.

Reset replaces only this demo key. It does not clear browser storage globally,
call any real service or change real records. Corrupt storage is reported and
requires the explicit **Reset saved demo only** action; it is not silently lost.

Use one active operator tab. Sequential stale-tab writes are detected and require
reload. Browser storage is not a transactional multi-user store and does not
provide authenticated staff access, cross-device persistence or tamper resistance.
History is capped at 2,000 commands. Demo identities are always simulated.

## Modules and handoff notes

- Vandan: `contracts.ts`, `input-adapter.ts`, `crowd-core.ts`, dashboard and staff
  action UI. Contract remains `taj-pilot-v1`; real writes are not enabled.
- Bhoomika implementation: `scenarios.ts` fixed fixtures; `demo-engine.ts` state
  and staff transitions; `demo-repository.ts` isolated persistence;
  `advisory.ts` bilingual preview; `taj-demo.test.ts` acceptance tests;
  `scripts/taj-pilot-acceptance.cjs` browser harness and recording.
- `mock-workspace.ts` is now a backwards-compatible alias to the shared demo
  engine for the original Vandan module tests.
- UI route: `apps/operations/app/taj-pilot/`.

## Checks and evidence

```sh
npm run test:operations
npm run typecheck:operations
npm run build:operations
```

Browser acceptance requires Playwright with Chromium installed and a running
local server. Run `node scripts/taj-pilot-acceptance.cjs` when Playwright is
resolvable, or set `PLAYWRIGHT_MODULE_PATH` to its installed module path.
`TAJ_PILOT_URL` optionally overrides the default localhost pilot URL.

The harness runs the complete journey twice, compares histories, verifies
persistence on reload, tests expiry/Unknown suppression, validates mode/reset
isolation and save failure/corrupt storage handling, and checks mobile overflow.
Outputs are written to `output/taj-pilot/`: JSON results, screenshots and a WebM
recording. Test browser storage is isolated from the user's open browser tab.

## Readiness and limitations

| Capability | Status |
| --- | --- |
| Three-zone synthetic demo and six scenario controls | Implemented |
| Assignment, acknowledgement, action note, recovery and resolution | Implemented with simulated actors |
| Saved demo history and demo-only reset | Implemented in this browser |
| Input authentication, ordering, replay and source validation | Tested with isolated synthetic test-workspace inputs |
| English/Hindi advisory, expiry and Unknown suppression | Implemented as preview only |
| Site-approved advisory wording | Pending; supplied text is labelled draft |
| Real-world monitoring and real actions | Not connected / disabled |
| Site authorization, calibrated live sources and verified capacity limits | Pending |
| Production staff access, transactional persistence and retention for pilot | Not verified or connected |
| Public notification delivery | Not implemented or enabled |
| Field trial / operational acceptance | Pending |

No site-approved advisory text was supplied, so the approved-template requirement
is not claimed complete. Proposed zone boundaries and demo rule values remain
illustrative. Before live activation obtain permissions, coverage/calibration,
approved thresholds and wording, verified access/storage, manual-count comparison,
a silent trial and operational acceptance.

## Verified result — 9 November 2026

- 40/40 operations tests passed, including 11 pilot/demo checks.
- TypeScript check and production build passed.
- Browser acceptance passed twice with identical histories, no browser errors,
  persisted reload, bilingual preview, expiry and Unknown suppression,
  real-mode isolation, demo-only reset, failed-write rollback, corrupt-store
  recovery and no horizontal overflow at a 390px viewport.
- Desktop and mobile screenshots visually reviewed, including Hindi text.
- Recording: `output/taj-pilot/taj-pilot-demo.webm`.
- Machine-readable result: `output/taj-pilot/acceptance-results.json`.
- Repository-wide whitespace check reports a pre-existing unrelated change in
  `ios/SanskritiAI/Views.swift`; that file was not modified for this task.

## Manual inputs and linked zones

Each demo zone card now accepts a manual whole-number count (0–100,000), saved
through the same validated demo repository. Zone 1 = East Gate, Zone 2 = main
gateway, Zone 3 = mausoleum approach. Set Zone 2 to 150, apply it, and advance the
clock three times by 10 seconds. Sustained congestion closes Zone 1 entry in the
simulation and suggests an orderly, staff-managed priority exit from Zone 3.
No physical gate control, real admission decision, public message or exit route
is implemented. These controls are absent in real mode.

The simulated closure persists through recovery until Zone 2 stays at 70 or
below for 20 seconds. Unknown Zone 2 data retains an existing simulated hold;
Unknown Zone 2 or Zone 3 suppresses exit advice. Reset clears the demo hold.
The map's selected-zone detail also displays the relevant entry/exit status.

Verification: 41/41 tests pass; production build/type validation passes. Browser
checks pass for manual input, sustained closure, exit suggestion, persisted
reload, recovery reopening, mobile overflow and real-mode control isolation.

## MMS hosting and database integration

The crowd pilot is now an MMS feature at `/mms/crowd`, linked from the Taj Mahal
site workspace. Hosted `/taj-pilot` also uses the MMS sign-in gate; local
`/taj-pilot` retains the standalone browser-storage demo for development.

The hosted feature uses the existing MMS Supabase client and staff membership.
Each user's Taj Mahal training journal is stored separately in
`public.mms_crowd_demo_workspaces`. The database enforces user ownership,
Taj Mahal membership, non-anonymous Auth, demo-only mode, size limits and
optimistic version checks. `mms_save_crowd_demo` runs as the caller (security
invoker); no service-role credentials or new secret variables are needed.

Cloud reset clears the signed-in user's demo journal only. It cannot change real
incidents, another user's workspace or physical gate state. The hosted feature
has no local-storage fallback when database access fails. Personal workspaces
resume across devices after signing into the same account. Staff-action actors
inside the simulation remain explicitly simulated.

Migrations:
- `20261109064812_mms_crowd_demo_workspaces.sql`
- `20261109064916_mms_crowd_demo_non_anonymous.sql`
- `20261109113836_mms_crowd_demo_policy_guards.sql`

Database verification used transaction rollback: authorized saves and version
increments passed; stale writes, real-mode payloads, cross-user reads/writes,
unauthenticated access and anonymous Auth were rejected. No test journal was
retained. Supabase's security advisor reported no findings for the new table.
Existing advisor warnings for unrelated tables/functions remain outside scope.
See the [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)
for the access model and [advisor guidance](https://supabase.com/docs/guides/database/database-advisors)
for reviewing existing project warnings.

Release source is the previously deployed MMS commit
`acb5ddd29b8d3c6f382786a36d2322ca65b09a16` plus the crowd feature files and MMS
feature card. Unrelated local edits are excluded. The release build and 41 tests
passed. Browser checks verified logged-out gating, the MMS entry link, cloud
save requests and reload using mocked authenticated transport; live database
permissions were independently verified with SQL. A real staff login browser
session has not been exercised by the agent.

The feature source and migrations are maintained on `codex/mms-crowd-simulation`
for integration into `main`. The production deployment was made from the same
feature source before this pull request. Merge the pull request before the next
Git-triggered production release to preserve the feature.

### Production deployment

- Project: `sanskriti-mms` (`prj_VTpq0iAdQEJoATJbcK9EC2UabSVS`).
- Deployment: `dpl_8QazaD7p7wALUAjp5t1qiMudpqGa`, status READY.
- Live feature: https://mms-sanskriti.vercel.app/mms/crowd
- Alternate existing domain: https://sanskriti-mms.vercel.app/mms/crowd
- Verified both primary aliases point to this deployment. Primary feature route
  responds HTTP 200 and the live browser displays the MMS sign-in gate with no
  console errors. Sign into MMS, select Taj Mahal, and open Crowd simulation.
- Production environment reuses the existing Supabase URL and publishable key;
  no credentials were added, changed, or included in uploaded source files.
