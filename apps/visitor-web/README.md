# Sanskriti visitor website

An installation-free heritage experience built with Next.js and React. Visitors
can discover monuments, explore routes and stories, ask Yatrik, recognise a monument
from a photograph and voluntarily report an issue to the site's MMS.

## Run locally

Requires Node 22.18+ and npm. From the repository root:

```sh
npm ci --prefix apps/visitor-web
cp apps/visitor-web/.env.example apps/visitor-web/.env.local
npm run dev:visitor
```

Open http://127.0.0.1:3200. The app has its own package and lockfile; root `npm ci`
installs the operations workspace only. Catalogue content can be explored without
AI credentials. Live services require configuration.

## Configuration and service modes

Use [.env.example](.env.example) for supported variables and defaults. Private
NVIDIA, Groq and Gemini keys belong on the server. Provider selection is implemented
in `lib/server/nvidia.ts` and the adjacent adapters; adding a key does not guarantee
quota, model availability or a successful response. Never prefix private keys
with `NEXT_PUBLIC_`.

| Reporting configuration | Behavior |
| --- | --- |
| Both public database URL and anon key present | Hosted MMS via visitor-report functions |
| No hosted credentials, local development | Loopback operations demo on port 3100 |
| Vercel without hosted credentials | Reporting unavailable |
| Non-Vercel production preview | Local demo only when `REPORTS_MODE=local-demo` is explicitly set |

Hosted intake requires the intended MMS database, anonymous sign-in and the
visitor-report migration in `supabase/migrations/`. The public credentials select
the hosted path even if `REPORTS_MODE` suggests another mode. Check the catalogue,
submission and receipt flow against the intended project before release.

`/api/status` exposes AI and reporting state flags without returning keys.
Unavailable services must remain visible to the visitor; do not treat fallback
content or a locally saved report draft as a successful live request.

## Structure

```text
app/                 Visitor routes, layouts and API handlers
components/          Screens, shell, Yatrik and adapted mobile components
lib/original/        Adapted mobile logic and offline content
lib/content/         Monument content
lib/server/          Provider adapters, input validation and report services
styles/              Shared tokens and screen styles
public/              Images, audio and interpretive historical scenes
tests/               Unit, content and route contracts
```

The website adapts mobile features from `apk/ui`; these copies are not automatically
synchronised. Review both implementations when changing shared payloads. The public
website is independently deployable and does not serve the native clients' bundle.

## Verify

From this directory:

```sh
npm test
npm run typecheck
npm run build
```

Or use the root `test:visitor`, `typecheck:visitor` and `build:visitor` commands.
Stop the development server before building because both use `.next/`.

The [27 October verification record](../../docs/visitor-web-verification.md)
documents local browser, live-service and build checks at that time. Re-run the
relevant acceptance checks for subsequent releases; it is not current public
hosting or physical-device certification.

## Deployment and content

Use `apps/visitor-web` as the application's build root and install its lockfile.
Configure service variables in the target environment, then verify HTTPS routes,
permissions, reports, AI failures and logs after deployment. Local operations
stores are not a hosted reporting backend.

Monument photographs have source and licence metadata in `lib/monument-photos.ts`;
keep visible credits. Generated Time Travel scenes are interpretations, and
historical text/audio require editorial review. Device voices, WebGL and permission
behavior vary by browser. See the [release checklist](../../docs/engineering/release-checklist.md).
