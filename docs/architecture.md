# Architecture and delivery boundaries

## Product surfaces

1. Android and iOS: full visitor experiences. The web interface currently lives
   in `apk/ui`, and iOS copies its exported assets. Keep those paths stable until
   a dedicated shared-mobile extraction has cross-platform build verification.
2. `apps/operations`: separate staff interface and local API. It does not import
   the visitor providers, demo auth, marketplace roles or mobile navigation.
3. NFC/QR visitor website: planned. It will reuse reviewed content and stable
   monument/checkpoint identities without exposing staff records.

## Operations foundation

- `app/`: Next.js entry points, styling and request handlers.
- `components/`: browser interactions and accessible, responsive screens.
- `lib/domain.ts`: incident state machine, validation, synthetic site/staff data
  and crowd freshness/count rules.
- `lib/store.ts`: local single-process storage adapter with serialized writes
  and atomic file replacement.
- `lib/request.ts`: loopback/origin checks and request errors for the sandbox.
- `lib/crowd.ts`: validated camera/presence input, ordering, independent session
  expiry, consent withdrawal and aggregate-only dashboard projection.
- `tests/`: workflow, freshness, persistence/concurrency and request-boundary checks.

The server is authoritative for workflow transitions. Updates carry the record
version, so a stale edit fails instead of overwriting another action. The UI
never claims its sample staff selection is authentication.

## Production boundary

Replace the local store with transactional storage and add real identity and
site membership before deployment. Test isolation across organisations. Add
private evidence uploads, auditable evidence access, notifications and backup
restoration. Keep privileged keys server-side.

Crowd monitoring combines complementary signals, not summed populations:
camera-based zone estimates, consented/expiring app presence and site-wide
entry/exit records. Uncovered or stale zones are unknown. Pilot calibration
must establish camera overlap, counting error and alert thresholds before
staff rely on it. All current sensor readings are labelled synthetic.

The input pipeline is now testable through the local simulator. See
[crowd input contract](crowd-inputs.md). This is not authenticated producer
ingestion, a real consent UI, geographic zone detection or a camera stream.

## Documentation

The canonical shareable PRD is `docs/product/Sanskriti-Product-Vision-Status-and-PRD.pdf`.
Its editable generator is `scripts/build-product-guide.py` (Python + reportlab;
Arial on macOS or Liberation Sans on Linux). Render and visually review every
regenerated PDF before committing it. `output/` is scratch artifact output;
only deliberately curated documents belong in `docs/`.
