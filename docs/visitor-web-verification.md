# Sanskriti website implementation and verification

Date: 27 October 2026 (India time).

## Repository assessment

The repository has four application surfaces: `apk/ui` is the shared visitor
Next.js interface; Android and iOS package its static export and add native
services; `apps/visitor-web` is an existing web adaptation; `apps/operations`
is a separate staff application. The iOS bridge exposes the same navigation,
speech, camera and AI contracts as Android. `supabase/migrations` already
contains the multi-site MMS database and public visitor-report RPCs.

The website's existing README was behind its code: a Supabase report adapter
and migration existed but were not wired to its public report route. Explore
was still a monument list instead of the shared mobile explorer. Its narration
route expected a different payload and returned JSON while Explore expects
WAV bytes. Those gaps have been repaired using existing assets and services.

The configured mobile database is reachable and supports the required public
catalogue, anonymous sign-in and receipt RPCs. The Supabase connector in this
chat is connected to a different project and cannot administer this database.
No database migrations or access-policy changes were performed.

## Evidence obtained

- All 45 automated tests passed, including the added report and narration coverage.
- Added hosted-report validation/configuration tests and a narration contract
  regression test (mobile request to WAV response).
- Browser: name entry, home navigation, Explore rendering, arrival story,
  next-zone progression, report site/category/area selection, submission,
  persisted receipt status, opening Yatrik, and a live heritage answer.
- Live report API: submission 201, retry 200 with `duplicate:true`, matching
  private receipt 200, invalid token 404, JPEG photo report 201.
- Live AI: Yatrik chat 200, Taj Mahal recognition 200, Hindi Explore translation
  200, static-scene Heritage Watch assessment 200 with no finding, narration
  200 with a RIFF/WAV header, synthetic voice question transcription 200.
- Three explicitly labelled verification incidents were saved to the existing
  MMS backend (API retry test, browser test, photo test). Each says there is no
  real incident and no staff action required. They were not silently deleted.
- Final production build and TypeScript check passed. Production-mode Explore,
  Report, catalogue, service status and private receipt POST returned 200.
- Production browser bundles: 37 JavaScript files scanned; no configured NVIDIA
  secret present.
- Dependency audit after updating Next.js/PostCSS: zero reported vulnerabilities.

Browser screenshots are under ignored `tmp/visitor-verification/`. Test
receipt tokens also remain only in that ignored directory, not source control.

## Deployment status and remaining checks

Vercel connector calls failed and the local CLI had no credentials. A sign-in
flow was offered; the user chose to continue building and sign in later.
No project was created, no production environment was changed, and no public
URL has been deployed. Do not describe localhost verification as deployment.

After sign-in: verify team/project, configure existing service settings via
secure environment-variable input, deploy, repeat status/browser checks on the
HTTPS URL and check deployment logs. Only then mark the deployment goal done.

Physical-phone permission behavior, sustained on-site GPS/compass accuracy,
and camera-based Heritage Watch detections have not been exercised. The
provided stock image scene test is not evidence of live detection accuracy.
No continuous background monitoring is active while deployment is pending.
Live GPS acquisition cannot unlock demo arrivals; Heritage Watch is active only
in live-camera mode with a live location session, never on synthetic demo routes.
