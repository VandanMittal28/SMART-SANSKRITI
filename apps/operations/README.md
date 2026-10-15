# Sanskriti Monument Management System

A separate staff console for monument operations. The visitor website remains a separate Vercel deployment.

## Production workspace

The MMS uses Supabase Auth and site-scoped Postgres tables. Its current workspace covers Taj Mahal, Qutub Minar, Red Fort and Konark Sun Temple, with zone lists specific to each site. Sign-in uses the administrator's email and password; `base` is an administrator username alias. Incident creation and status transitions are recorded with an audit history. Row Level Security and database functions enforce site membership and workflow transitions.

The initial administrator is provisioned only for the verified address authorized in the MMS database migration. After that account verifies its email and signs in, the app grants it access to the four MMS sites. Do not add an administrator by changing client-side code. Staff logins are not provisioned from this screen; additional staff accounts need a verified Supabase Auth account and a site membership before they can use the console.

The `mms_*` tables are separate from the visitor profiles and marketplace tables. Monument site records are read from the existing `heritage_sites` directory. Site zone capacities are intentionally unset until a site operator supplies verified limits.

## Run locally

Requires Node 22.18+ and npm.

```sh
npm ci
npm run dev:operations
```

Open http://127.0.0.1:3100. The server binds to loopback only. No credentials or database setup are needed for this **local sandbox**.

## Local operations prototype

- Overview with derived incident metrics, review queue and illustrative site layout.
- Create staff reports; search and filter incidents.
- Review → confirm/dismiss → assign → acknowledge → start work → resolve → close.
- Required action notes, valid staff assignments, server-side transitions and version-conflict protection.
- Local file persistence with serialized, atomic writes; failed reads never silently reset records.
- Sample field-staff assignments and a complete case history attributed to the local operator.
- Zone crowd view: calibrated sample camera counts and app-user samples shown separately. Offline, partial, invalid or stale camera readings are unknown, never zero. Samples expire after five minutes. Replay is explicitly a simulation.
- Crowd input simulator and API: anonymous sessions move between zones, expire independently and withdraw consent; camera readings validate source, ordering and freshness. Exact retries do not inflate counts. Individual sessions are omitted from dashboard responses. See [input contract](../../docs/crowd-inputs.md).
- Export a labelled JSON workspace report including histories and source timestamps.
- Responsive interface, keyboard-operable native dialogs and visible error states.

Synthetic seed data uses a fictional Heritage Park. No live monument, staff, admissions or cameras are represented. The schema and workflow are a foundation, not a claim of deployed management operations.

## Data and boundaries

The older prototype routes below still use `.data/operations.json` and `.data/report-demo.json`; they are explicitly localhost-only and are not used by the production MMS screen. One Node process must own these local stores. They are unsuitable for serverless/multi-instance deployment.

Local API routes reject remote hostnames and cross-origin requests. Production-mode APIs fail closed unless `OPS_LOCAL_DEMO=true` is deliberately supplied for a local preview. This is **not authentication or role-based access control**. Do not expose the sandbox through a public proxy. The staff selector filters assignments; it does not impersonate or authenticate anyone. Every change is attributed to the local operator.

The sample site/roles are server-defined. Client input cannot change the site or set arbitrary initial statuses. Create requests use a request UUID so retries do not duplicate a report; updates use record versions to reject conflicting edits. This is single-process protection, not a substitute for database transactions.

## Checks

```sh
npm run test:operations
npm run typecheck:operations
npm run build:operations
```

For a local production-build preview only: `OPS_LOCAL_DEMO=true npm run start --workspace sanskriti-operations`.

## Next delivery milestones

1. Add genuine staff authentication, organisation/site membership and server-enforced permissions, with isolation tests for two organisations. Do not reuse visitor or marketplace admin flags.
2. Replace the local store adapter with transactional database persistence. Add private evidence storage, audit access controls, migrations and retention policies.
3. Add voluntary visitor-report ingestion, upload validation, supervisor reassignment/escalation and guard-specific authorised sessions.
4. Add consented app presence with zone boundaries, freshness/expiry and deduplication; connect one camera gateway and calibrate overlap/count error against manual counts.
5. Integrate authorised ticket entry/exit records. Only then reconcile site occupancy and generate a real daily report.
6. Validate sustained crowd thresholds, camera alerts and safe-route recommendations at a pilot site before calling them operational.

Not implemented in the production MMS: visitor report intake/evidence, staff invites and duty tracking, live cameras or occupancy, ticketing, notifications, or production daily scheduling. The old prototype still demonstrates some of these flows locally. Do not treat its sample data, AI triage, or locations as live monument operations.

## Android visitor report demonstration

Run the local MMS server on port 3100, then open it in a browser. The first screen
lets you select **Admin** or **Ground staff** and a sample staff profile. These
selectors are demonstration access only. Admins can review reports, duty zones,
staff availability, evidence, NVIDIA AI triage and overdue alerts. Staff
see their own duty area and assignments, and share GPS only while on duty and
while the page is open.

The Android debug build sends guest reports to the local MMS server using a
localhost-only native bridge. Connect an Android device and forward its port:

```sh
adb reverse tcp:3100 tcp:3100
npm run dev:operations
```

Install `apk/app/build/outputs/apk/debug/app-debug.apk`, then use **Report issue**
from the login screen or any app screen. The phone and server must remain
connected for submission and status refresh. A failed submission stays as a
local draft with the same receipt token for safe retry. The Android build is a
local demo; the server remains bound to loopback. If port 3100 is already in use,
stop that server before starting this version.

Set `NVIDIA_API_KEY` in `apps/operations/.env.local` before starting the MMS
server. `NVIDIA_VISION_MODEL` can override the default
`meta/llama-3.2-11b-vision-instruct` model. The server sends each
new report's category, note and supported JPEG/PNG photo to NVIDIA for triage;
the key stays server-side. Only a valid **relevant** model response can trigger
automatic dispatch. Uncertain, irrelevant, failed or unconfigured assessments
go to admin review. WebP photos are retained for admin review, but are not
automatically dispatched because the configured model does not support them.
Previously submitted reports keep their original assessment history.

Assignment uses GPS updated in the last two minutes, then duty zones.
An unaccepted assignment alerts after one minute; an unresolved report alerts
five minutes after receipt. The local server checks deadlines every five seconds
while running and persists alerts in `.data/report-demo.json`. Private photos are
stored in `.data/report-evidence/` and served only through role-checked routes.
AI triage is not a factual finding about a visitor or an operational safety
system. Demo staff and the report store are local to this machine.
