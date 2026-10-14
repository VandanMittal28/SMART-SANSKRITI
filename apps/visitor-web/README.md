# Sanskriti visitor website

A phone-first website for visitors to Indian heritage sites:

1. **Recognise a monument** from a photo (camera or gallery).
2. **Ask Yatrik**, the heritage guide, in English or Hindi, by text or voice.
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
| Yatrik chat | Answers quoted from saved monument notes, clearly labelled | Live AI answers (unverified) |
| Voice questions | Hidden; the panel explains why | Recorded in the browser, transcribed server-side (unverified) |
| Read answers aloud | Browser speech (device voices; many lack Hindi) | Same |
| Recognition | Photo selection and preview; Identify is disabled with an explanation | NVIDIA vision model (unverified) |
| Reporting | Works when the operations demo is running on this computer | Same |

`/api/status` tells the interface which of these are switched on; it returns
booleans only.

## Architecture

```
app/
  page.tsx                 welcome (name entry, photo backdrop)
  (visitor)/               name gate + shell: home, monuments, monuments/[id], recognize, report
  api/status|chat|recognize|transcribe|reports/route.ts
components/
  shell/app-shell.tsx      header, phone bottom nav, desktop Yatrik dock
  yatrik/                  provider (conversation), panel, avatar, speech, recorder
  recognize/, report/, monuments/, home/, visitor/, ui/
lib/
  content/                 monuments (16), name matching, offline answers
  server/                  nvidia.ts, ops.ts, validate.ts, http.ts (server-only)
  monument-photos.ts       licensed photos + attribution checks
  recognition-prep.ts      photo preprocessing + result cache
  report.ts, image.ts, audio.ts, api.ts, visitor.ts
styles/                    tokens, base, components, one file per screen
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
- Report photos are re-encoded as JPEG on the device, which strips EXIF
  location data.

## Reuse of the existing app

Copied or adapted, never imported across apps and never modified at the source:

| Source (`apk/ui/…`) | Used in | How |
|---|---|---|
| `lib/nvidia.ts` | `lib/server/nvidia.ts` | Copied: prompts, request, polling and parsing kept. Changed: missing key → 503, no upstream error text to visitors, monument names from this guide; the other-language refusal translation is omitted (en/hi only) |
| `app/api/chat`, `app/api/transcribe` | `app/api/*/route.ts`, `lib/server/validate.ts` | Same request/response fields; adds size limits, rate limits and 503s |
| `lib/apiClient.ts` (`image_b64`) | `app/api/recognize`, `lib/api.ts` | Same field name; the route didn't exist in `apk/ui` |
| `lib/audio.ts` | `lib/audio.ts` | Copied unchanged (formatting only) |
| `lib/monumentData.ts` | `lib/content/monuments.ts` | Copied; typos fixed, two claims softened (documented in the file) |
| `lib/monumentStore.ts` `monumentNameToId` | `lib/content/match.ts` aliases | Its names became aliases |
| `lib/offlineHeritage.ts` | `lib/content/offline-answers.ts` | Adapted: quotes guide text only. The original returned Taj Mahal visiting facts for any monument |
| `app/recognition/page.tsx` | `lib/recognition-prep.ts` | Preprocessing, hashing and the 0.65 threshold copied |
| `app/report/page.tsx` | `components/report/report-flow.tsx`, `lib/report.ts` | Categories, zones, draft, token, 5 s polling kept; sent via this server |
| `components/yatrik/yatrik-artwork.tsx` | `components/yatrik/yatrik-avatar.tsx` | Same frame cycling, smaller |
| `public/yatrik/pulkit-v1` | `public/yatrik/` | 11 frames resized to 192px PNG |
| `public/audio/*.mp3` | `public/audio/` | 14 files byte-identical, renamed by monument id (`sun_temple` → `konark`) |

Not reused, deliberately: the floating draggable Yatrik companion and XP event
system (they would cover content and depend on accounts), the Android native
bridge, Supabase auth, and the original 640px-only image picker UI.

## Content and assets

- **Monument text**: from the app's notes, not independently reviewed. Pages
  say so and point to the Archaeological Survey of India.
- **Photos**: 16 authentic photographs from Wikimedia Commons (own work, camera
  metadata, attribution licences: CC BY-SA 3.0/4.0 and Free Art Licence 1.3).
  Credits appear under each photo and on the welcome screen. Their review in
  `lib/monument-photos.ts` is marked "automated check, awaiting owner
  confirmation". A person should confirm them before launch. The app's own
  `time_travel` images were rejected: they are generated 360° renders.
- **Audio stories**: the app's recordings; their spoken content hasn't been
  reviewed for this website.
- **Yatrik**: the existing character artwork (Pulkit).

## Deploying (Vercel)

Deploy as a standalone Next.js project with **Root Directory `apps/visitor-web`**.
Set `NVIDIA_API_KEY` as a server-side (Sensitive) environment variable; the
model variables are optional because the defaults match the original app.
No Supabase keys are needed, and `.env.local` is never deployed.

On Vercel (`VERCEL=1`), reporting is switched off: `/api/status` reports
`mode: "unavailable"`, `/api/reports` refuses without contacting anything, and
the report page says "Reporting isn't available on the public website yet." with
the form disabled. Locally, reporting works with the operations demo as before.
Recognition allows up to 90 s (`maxDuration`), which needs Vercel Fluid compute
(the default for new projects).

## Known limitations

- NVIDIA-backed features are untested against the live service.
- Reporting is a local demo for the sample "Heritage Park" site. A public
  deployment needs a real, authenticated reporting backend.
- Hindi speech output depends on the visitor's device having a Hindi voice.
- Not yet tested on physical phones, iOS Safari or Firefox.
