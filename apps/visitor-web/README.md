# Sanskriti visitor website

A phone-first website for visitors to Indian heritage sites. Three features
are ported from the original Sanskriti app (`apk/ui`) with its screens,
wording and logic:

1. **Monument Recognition** from a photo (camera or upload), opened from
   Explore and the home screen's "Scan a monument" card (no tab of its own).
2. **Yatrik**, the heritage guide, opened from the floating character, by text
   or voice.
3. **Report an issue** at a site (local operations demo).

It also includes a guide to 16 monuments with licensed photographs and, for
seven of them, narrated audio stories in English and Hindi.

**Not production-ready.** Recognition, live chat and transcription need an
NVIDIA key and haven't been exercised against the live API from this website.
Reporting works only with the local operations demo.

## Run locally

Requires Node 22.18+.

```sh
cd apps/visitor-web
npm install               # this app only; uses apps/visitor-web/package-lock.json
cp .env.example .env.local   # optional: add NVIDIA_API_KEY
npm run dev               # http://127.0.0.1:3200
```

For reporting, start the operations demo in another terminal from the
repository root: `npm ci && npm run dev:operations` (port 3100).

```sh
npm run typecheck
npm test                  # Node's built-in test runner
npm run build && npm start
```

Don't run `npm run build` while `npm run dev` is running in the same folder:
both use `.next/`.

## What works without configuration

| Feature | Without `NVIDIA_API_KEY` | With it |
|---|---|---|
| Welcome, home, monument guide, photos, audio stories | Works | Works |
| Yatrik chat | The original's offline guide answers (as the app does when its AI is unreachable) | Live AI answers (unverified) |
| Voice questions (Yatrik, recognition audio guide) | Recording works; the original "Could not understand the recording." toast | Transcribed server-side (unverified) |
| Spoken replies, audio guide | Device speech, as in the original's browser path | Same |
| Recognition | The original "Recognition is offline" panel | NVIDIA vision model (unverified) |
| Reporting | Works when the operations demo is running on this computer | Same |

`/api/status` tells the home screen what is switched on, without exposing keys
or URLs: `live`, `ai` (`ready`, `missing` = no key, `rejected` = NVIDIA
answered 401/403 to the configured key) and `reports.mode` (`local-demo` or
`unavailable`). The ported screens don't consult it: like the original, they
make the request and show the original's error or offline behaviour.

## Architecture

```
app/
  page.tsx                 welcome (name entry, photo backdrop)
  (visitor)/               name gate + shell: home, monuments, monuments/[id], recognize, report
  api/status|chat|recognize|transcribe|reports/route.ts
components/
  original/                screens ported from apk/ui: recognition/, report/, chat/ (Yatrik)
  shell/app-shell.tsx      header and phone bottom nav (Home / Explore / Report)
  yatrik/                  floating character, panel container, open/close state
  monuments/, home/, visitor/, ui/
lib/
  original/                modules copied from apk/ui (cache, offline answers, monument data, audio guide…)
  content/                 monuments (16), name matching
  server/                  nvidia.ts, ops.ts, validate.ts, http.ts (server-only)
  monument-photos.ts       licensed photos + attribution checks
  report.ts, audio.ts, api.ts, visitor.ts
styles/                    tokens, base, components, one file per screen; original.css for the ported screens
public/time_travel/        the original's 360° time-travel panoramas
tests/                     unit + route tests (node --test)
```

### Safeguards

- Private keys are read only in `lib/server/*` and never reach the browser
  (checked by scanning the production client bundle).
- Every route validates its input, enforces a body-size limit, and
  rate-limits per client in memory: chat 20/min, recognition 6/min,
  transcription 12/min, reports 10/min. The rate limiter works per process
  and doesn't replace gateway rate limiting for a public deployment.
- Yatrik's answers fail closed: only replies the model explicitly marks as
  heritage-related are shown.
- Reports go only to a loopback `OPS_BASE_URL`, with validated fields only,
  no cookies or Origin header. Success is shown only when operations returns
  an id and status. The operations demo's own restrictions are unchanged.
- Visitor names are stored in `localStorage` only. This is **not
  authentication**; the redirect to `/` is a convenience, not access control.
- Report photos are sent as chosen (JPEG, PNG or WebP, under 2 MB), as in
  the original; the server checks that the content matches the declared type.

## Ported from the original app

Recognition, reporting and Yatrik are copied from `apk/ui` (never modified at
the source, never imported across apps). Each copied file starts with a
comment listing every change; in short:

| Original (`apk/ui/…`) | Here | Changes |
|---|---|---|
| `app/recognition/page.tsx`, `components/recognition/*` | `components/original/recognition/` | Website shell instead of AppShell; "Start tour" opens Explore (`/monuments`); quiz and treasure-hunt entries left out (not part of the website); XP awards left out (no accounts; the toast and banner show as for a signed-out visitor) |
| `app/report/page.tsx` | `components/original/report/report-screen.tsx` | Sent through this website's `/api/reports` bridge to the same operations endpoint; "← Back to app" falls back to `/home` |
| `app/chat/page.tsx` | `components/original/chat/chat-screen.tsx` | Opened from the floating Yatrik in a panel with a close button; no saved conversations or user type (no accounts) |
| `hooks/useAudioGuide.ts`, `lib/apiClient.ts`, `lib/cache.ts`, `lib/offlineHeritage.ts`, `lib/monumentData.ts`, `lib/monumentStore.ts`, `lib/languages.ts`, parts of `lib/languageContext.tsx` and `lib/quizQuestions.ts`, `components/Toast.tsx` | `lib/original/`, `components/original/Toast.tsx` | Android-only native NVIDIA voice/microphone branches removed (the original's browser path remains); chat and recognition use this website's routes |
| lucide-react icons, Tailwind styling | `components/original/icons.tsx`, `styles/original.css` | Same icon data and generated styles, scoped to `.sanskriti-original`, without adding dependencies |
| `public/time_travel/*`, `public/audio/*` | same paths (audio renamed by monument id) | Byte-identical (the unreferenced nested `time_travel/time_travel/` duplicates are left out) |
| `lib/nvidia.ts`, `app/api/chat`, `app/api/transcribe` | `lib/server/nvidia.ts`, `app/api/*` | Same prompts and request fields; adds size limits, rate limits and 503s |

Language follows the original's saved setting (`sanskriti-language-v1`,
English by default); its picker is on the original Profile screen, which isn't
part of the website, and its translation service isn't either.

The original's browser build sent chat to an external backend
(`heritageai-backend.onrender.com`), which did not respond when checked; chat
goes to this website's `/api/chat`, as the original's iOS build does.

## Content and assets

- **Monument text**: from the app's notes, not independently reviewed. Pages
  say so and point to the Archaeological Survey of India.
- **Time-travel panoramas** (`public/time_travel`, 32 images, about 23 MB):
  the original app's generated 360° renders, shown in its Time travel tab as
  in the app. The original also contains a nested `time_travel/time_travel/`
  folder of byte-identical duplicates that nothing references; it is not
  copied here.
- **Photos**: 16 authentic photographs from Wikimedia Commons (own work, camera
  metadata, attribution licences: CC BY-SA 3.0/4.0 and Free Art Licence 1.3).
  Credits appear under each photo and on the welcome screen. Their review in
  `lib/monument-photos.ts` is marked "automated check, awaiting owner
  confirmation". A person should confirm them before launch.
- **Audio stories**: the app's recordings; their spoken content hasn't been
  reviewed for this website.
- **Yatrik**: the existing character artwork (Pulkit).

## Deploying (Vercel)

Deploy as a standalone Next.js project with **Root Directory `apps/visitor-web`**.
Set `NVIDIA_API_KEY` as a server-side (Sensitive) environment variable; the
model variables are optional because the defaults match the original app.
No Supabase keys are needed, and `.env.local` is never deployed.

Reporting is switched off on Vercel and in any production build unless
`REPORTS_MODE=local-demo` is set on a non-Vercel server (for testing
`npm start` next to the operations demo). When off, `/api/status` reports
`mode: "unavailable"`, `/api/reports` refuses before contacting anything (every
call to operations re-checks this), and sending a report shows the original
error format: "Reporting isn't available on the public website yet. Draft
saved on this phone; retry when connected." In development
(`npm run dev`) it works with the operations demo as before.

There is no public reporting destination yet: operations stores reports in
local JSON files and the Supabase project only holds marketplace tables. To
enable public reporting later, add an authenticated intake service (for
example a Supabase `visitor_reports` table with row-level security, private
storage for photos, server-side insert via a service role key, abuse limits,
and a staff view), point the reports bridge at it instead of operations, and
only then remove the Vercel/production guard.
Recognition allows up to 90 s (`maxDuration`), which needs Vercel Fluid compute
(the default for new projects).

## Known limitations

- NVIDIA-backed features are untested against the live service.
- Reporting is a local demo for the sample "Heritage Park" site. A public
  deployment needs a real, authenticated reporting backend.
- Speech output depends on the visitor's device voices.
- The Time travel viewer loads three.js from cdnjs, as in the original, and
  needs WebGL.
- Some original controls are smaller than 44 px (Yatrik's suggestion chips,
  the report screen's back link); they are kept as in the original.
- Not yet tested on physical phones, iOS Safari or Firefox.
