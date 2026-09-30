# Sanskriti operations foundation

A separate staff console for the monument-management product. The Android and iOS visitor projects are unchanged.

## Run locally

Requires Node 22.18+ and npm.

```sh
npm ci
npm run dev:operations
```

Open http://127.0.0.1:3100. The server binds to loopback only. No credentials or database setup are needed for this **local sandbox**.

## Working now

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

Data is stored at `.data/operations.json` (git-ignored). Use synthetic, non-sensitive data only. Back up this file to preserve local changes. One Node process must own this store; it is not a shared database and is unsuitable for serverless/multi-instance deployment. Corrupt or incompatible data fails visibly instead of being overwritten.

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

Not implemented: production login, multi-site access, evidence upload, live notifications, automatic escalation, live cameras/location, NFC website, ticketing, production daily scheduling or cloud deployment.
