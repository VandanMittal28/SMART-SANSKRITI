# Sanskriti Monument Management System

A separate staff console for monument operations. The visitor website remains a separate Vercel deployment.

**Live console:** [mms-sanskriti.vercel.app](https://mms-sanskriti.vercel.app)

**Crowd feature:** [MMS crowd management](https://mms-sanskriti.vercel.app/mms/crowd)

Staff sign-in and site permissions are required. Crowd demonstration data is
synthetic; a hosted interface does not establish live camera coverage.

## Database-backed workspace

The MMS uses Supabase Auth and site-scoped Postgres tables. Its current workspace covers Taj Mahal, Qutub Minar, Red Fort and Konark Sun Temple, with zone lists specific to each site. Sign-in uses the administrator's email and password; `base` is an administrator username alias. Incident creation and status transitions are recorded with an audit history. Row Level Security and database functions enforce site membership and workflow transitions.

The initial administrator is provisioned only for the verified address authorized in the MMS database migration. After that account verifies its email and signs in, the app grants it access to the four MMS sites. Do not add an administrator by changing client-side code. Staff logins are not provisioned from this screen; additional staff accounts need a verified Supabase Auth account and a site membership before they can use the console.

The `mms_*` tables are separate from the visitor profiles and marketplace tables. Monument site records are read from the existing `heritage_sites` directory. Site zone capacities are intentionally unset until a site operator supplies verified limits.

## AI review in the main MMS

Each saved incident has an **AI review** panel. Opening it as a site administrator
or manager assesses the saved description/category and any visitor JPEG with the
existing NVIDIA vision service. The browser submits only the incident ID; the
server verifies the session and site role, reads the saved input, and downloads
private evidence using that user's permissions. Ordinary staff can read a saved
assessment but cannot request one.

Apply `supabase/migrations/20261107153229_mms_ai_assessments.sql` to the same
database used by MMS before enabling this feature. Configure
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), and server-only `NVIDIA_API_KEY` in the
operations deployment. `NVIDIA_VISION_MODEL` is optional and defaults to
`nvidia/nemotron-3.5-super-vl-120b-a12b`. The retired Llama 3.2 11B setting is automatically mapped to this replacement. No service-role key is needed.

New assessments can mark clear advertising, scams, or junk as **Suspected spam**, with a reason. The report remains visible and a manager decides whether to dismiss it. Missing photos, brief notes, spelling errors, and unverified allegations alone are not spam. Existing saved assessments are retained without automatic reclassification. Apply `supabase/migrations/20261107155021_mms_ai_spam_classification.sql` for this classification.

Completed assessments are retained in `mms_ai_assessments`, including the model,
requesting manager, result, reason, and timestamp. Subsequent opens reuse the
first completed assessment. Missing configuration, unreadable photos, and failed
model calls show a manual-review message and can be retried. Storage failures do
not display an unsaved result as successful. Missing AI storage does not disable
the normal incident workflow.

This is manager-triggered advice, not automatic intake processing or dispatch.
It never changes incident status, priority, or assignment. It is separate from the visitor website’s hosted-report adapter. Existing local demo dispatch
remains separate. The new migration must be applied and the operations app
deployed before this is available on the hosted console.

## Run locally

Requires Node 22.18+ and npm.

```sh
npm ci
npm run dev:operations
```

Open http://127.0.0.1:3100 for the database-backed MMS. Configure the public database settings in `apps/operations/.env.local` and sign in with an authorised staff account. The server binds to loopback only.

For a configuration-free **local crowd simulation**, open http://127.0.0.1:3100/taj-pilot instead. This route uses synthetic scenarios in ordinary local development; on Vercel it selects the integrated MMS crowd interface. See the [pilot guide](../../docs/taj-pilot-delivery.md).

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

## Delivery boundaries and next milestones

The current source includes staff authentication, site membership, database-backed
incidents, audit history and manager-requested AI review. The visitor website now
has a hosted-report adapter. Each needs its intended database configuration and
release acceptance; older local demos remain separate implementations.

Next work includes staff invitations and duty lifecycle, calibrated live camera
inputs, authorised ticket entry/exit integration, notifications, retention and
operational reporting. Synthetic crowd scenarios are not live occupancy. Verify
cross-site isolation and the full visitor-report-to-resolution journey before
accepting a site deployment. See the [roadmap](../../docs/product/roadmap.md).

## Android visitor report demonstration

The retained local report-demo components and `/api/demo/*` routes demonstrate
**Admin** and **Ground staff** sample profiles. They are separate from the current
root MMS screen, which uses genuine staff sign-in. Any sample profile selector is
demonstration access only. The demo supports reports, duty zones,
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

Copy `apps/operations/.env.example` to `apps/operations/.env.local` from the repository root and fill in
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; without them the
console cannot reach the database and fails with "MMS database configuration is
missing." Set `NVIDIA_API_KEY` in the same file before starting the MMS
server. `NVIDIA_VISION_MODEL` can override the default
`nvidia/nemotron-3.5-super-vl-120b-a12b` model. The server sends each
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
