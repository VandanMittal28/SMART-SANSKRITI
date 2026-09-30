# Operations implementation status

Updated 30 September 2026. This supersedes the PRD's planning-only description
of monument operations; the PDF remains a dated product-planning baseline.

## Completed local milestones

1. Separate responsive operations workspace: overview, incident register,
   field-team assignments, zone conditions and JSON report export.
2. Server-validated incident workflow with required notes/owners, version
   conflicts, idempotent report creation and persisted history.
3. Local crowd input API and simulator: consented anonymous presence,
   movement between zones, independent expiry, withdrawal, validated camera
   registry, sequence ordering and conflicting-retry rejection.
4. Aggregate dashboard projection: no individual session IDs in responses;
   camera estimates never add app users; stale/offline/partial coverage is
   unknown. Sample capacities and calibrated flags are demonstration fixtures.
5. Root npm workspace, curated product PDF/docs, contribution guidance and
   GitHub Actions checks.

## Verification performed

- 12 automated tests cover workflow constraints, conflict handling,
  concurrent local writes, persistence, crowd expiry/deduplication, withdrawal,
  invalid inputs, privacy projection and local request boundaries.
- TypeScript checks and optimized production build pass.
- Browser journey: create → review → confirm → assign → acknowledge → start
  → resolve → close, then reload and locate the persisted case.
- Browser/API checks: sample replay, report download, anonymous heartbeat,
  zone movement, camera input, withdrawal, retry/conflict and cross-origin
  rejection. Incident records are preserved when changing crowd modes.
- Desktop and 390px mobile layouts were checked; no page-level horizontal
  overflow or browser runtime errors were found in the tested flows.

## Next production milestone

Real staff authentication and site-scoped authorization, transactional database
storage, private evidence and tested organisation isolation must precede any
public deployment. After that, connect real visitor consent/zone detection and
an authenticated camera gateway. Ticket admissions, actual live feeds,
sustained congestion alerts, escalation notifications and safe-route guidance
are still unimplemented.

The current sandbox binds to localhost and uses synthetic data. It is a working
implementation foundation, not a deployed control room or proven crowd detector.
