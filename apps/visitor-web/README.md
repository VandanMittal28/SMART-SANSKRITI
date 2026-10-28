# Sanskriti visitor website

A Next.js website built from the existing Sanskriti iPhone/Android interface,
focused on **Explore, Report and Yatrik**. The mobile source remains unchanged.

## Run

Requires Node 22.18+.

```sh
cd apps/visitor-web
npm ci
cp .env.example .env.local
# Configure the existing Sanskriti NVIDIA and public Supabase settings.
npm run dev
```

Open http://127.0.0.1:3200. Name entry personalises this browser; it is not
account authentication. The existing staff console remains separate.

## Features

- **Explore** (`/explore`): the shared iPhone screen, zone stories, journey
  selection, map, progress, arrival flow, narration and opt-in Heritage Watch.
  The original five built-in journeys are retained. Demo modes explicitly use
  synthetic GPS. Live Map uses browser location; Live Camera additionally uses
  camera and device orientation. Missing permissions have a map fallback.
- **Report** (`/report`): real MMS site/area selection, optional photo and
  location, durable submission, draft recovery, idempotent retries and private
  receipt status. Reports are supported at Taj Mahal, Red Fort, Qutub Minar
  and Konark, matching the existing database's configured sites.
- **Yatrik**: the original floating character and chat screen, live heritage
  answers, voice questions, spoken replies and curated offline answers.
  Opening it from Explore passes the selected monument as context.
- The existing monument library, photo recognition, audio stories and
  time-travel panoramas remain accessible within the heritage experience.
- English/Hindi selection is available in the header.

## Existing services reused

`NVIDIA_API_KEY` stays server-side and powers chat, vision, transcription,
translation and neural narration. The original browser speech fallback remains.
No OpenAI key or new provider is required.

With `REPORTS_MODE=supabase`, reporting uses the app's existing public
Supabase URL/anon key, anonymous authentication, the `visitor-reports` private
bucket, `mms_submit_visitor_report` and `mms_visitor_report_status` RPCs, and
existing MMS incident records. The existing migration is
`supabase/migrations/20261015101000_mms_public_visitor_reports.sql`.
No schema changes were applied in this website implementation.

Photos are converted to JPEG in the browser, resized to 1600px maximum,
and validated before upload. Receipt lookup from the browser uses a POST
body so private tokens do not appear in request URLs. Legacy GET receipt
lookup is retained for compatibility. A successful retry returns the original
receipt before creating another anonymous user or uploading another photo.

Heritage Watch retains the mobile motion/corroboration pipeline. It is opt-in,
labels model observations as needing human confirmation, and only sends a
report when the selected site and waypoint can be matched to the real report
catalogue. Otherwise it asks the visitor to use Report to confirm the area.

Without hosted settings, the isolated local operations demo is still supported
in development. Local forwarding remains forbidden on Vercel.

## Verification

```sh
npm run typecheck
npm test
npm run build
npm audit
```

Do not build while the development server is running: both use `.next`.
After editing ported component classes, regenerate the scoped utilities:

```sh
npm run styles:mobile
```

See [website verification](../../docs/visitor-web-verification.md) for the
checks performed, remaining boundaries, and deployment status.

## Deploy to Vercel

Use a standalone Next.js project whose root is `apps/visitor-web`.
Configure the environment variables listed in `.env.example` in Vercel.
Set `NVIDIA_API_KEY` as a sensitive server variable. Never deploy `.env.local`.
The two `NEXT_PUBLIC_SUPABASE_*` values are public project credentials; never
substitute a service-role key. Use Node 22.x and Fluid Compute for the AI routes.

After signing in to Vercel, link the intended team/project, deploy a staged
production build, verify `/api/status` and the browser flows, then assign the
production domain. This repository is not yet linked to a Vercel project.

## Boundaries

- Vercel deployment is pending user sign-in; localhost is not a public website.
- Physical iPhone/Safari camera, microphone and GPS have not been tested here.
  Browser hardware capabilities and permissions differ from the native shell.
- API rate limits are per server process, not a shared multi-instance quota.
  Anonymous account creation is also governed by Supabase's existing limits.
- Staff response times and real-world monument staffing are not verified.
- Original monument stories and recordings were reused, not fact-checked in
  this implementation. Original map demo routes are intentionally synthetic.
- Explore points are session progress, not authenticated account XP.
- Assets retain their existing credits. Map attribution is now visible.
