# Getting started

## Prerequisites

Use Git, npm and Node.js 22.18 or later in the Node 22 line used by CI.
`.nvmrc` selects Node 22 if you use nvm. Android additionally needs Android Studio,
a suitable JDK and Android SDK. iOS needs macOS, Xcode 16+ and an iOS 18+ target.
Python 3 and `rsync` are used by the shared mobile bundling scripts.

```sh
git clone https://github.com/VandanMittal28/SMART-SANSKRITI.git
cd SMART-SANSKRITI
npm ci
```

## Start with the local crowd pilot

```sh
npm run dev:operations
```

Open http://127.0.0.1:3100/taj-pilot. In ordinary local development this route
needs no credentials and uses synthetic data. Follow the
[pilot demo sequence](../taj-pilot-delivery.md). On Vercel this route selects the
MMS crowd interface instead; it is not the same configuration-free local demo.

## Configure the management console

From the repository root:

```sh
cp apps/operations/.env.example apps/operations/.env.local
```

Supply the intended project's public database URL and public client key, then
restart the server. The `/` screen requires a verified staff account and the
appropriate site membership. A public client key does not grant staff access.
Existing MMS migrations live at `supabase/migrations/`; review the target database,
migration history and bootstrap requirements before applying changes. An empty
project is not automatically a seeded, ready-to-use MMS deployment.

The optional server-only NVIDIA key enables AI assessment paths. Missing AI
configuration must not be mistaken for a completed assessment. See
[operations setup](../../apps/operations/README.md) for roles and demo boundaries.

## Run the visitor website

```sh
npm ci --prefix apps/visitor-web
cp apps/visitor-web/.env.example apps/visitor-web/.env.local
npm run dev:visitor
```

Open http://127.0.0.1:3200. Use the checked-in example for the supported provider
settings; blank provider keys leave the corresponding live features unavailable.
The server selects AI adapters according to its implemented provider logic.

Hosted reporting requires the intended MMS database, its visitor-report migration
and anonymous sign-in support. With both public database values present, the
website selects `hosted-mms`. Without them it can use the loopback operations demo
in development; Vercel never uses that local bridge. Production builds without
hosted credentials disable reporting unless a non-Vercel local preview explicitly
sets `REPORTS_MODE=local-demo`. `/api/status` exposes service-state flags.

## Build the installed apps

Install the shared UI dependencies first:

```sh
npm ci --prefix apk/ui
```

For Android, follow the SDK/JDK setup in the [Android guide](../../apk/README.md),
then run from `apk/`:

```sh
./gradlew assembleDebug
```

For iOS, generate the shared export from the root:

```sh
(cd apk && ./scripts/build-mobile-ui.sh)
open ios/SanskritiAI.xcodeproj
```

Select the scheme and signing team as described in the [iOS guide](../../ios/README.md).
Any private key placed in a native bundle is extractable; local demo configuration
is not an acceptable production credential architecture.

## Verification commands

From the repository root, after installing the target dependencies:

```sh
npm run check:docs
npm run test:operations
npm run typecheck:operations
npm run build:operations
npm run test:visitor
npm run typecheck:visitor
npm run build:visitor
npm test --prefix apk/ui
```

Stop a development server before building the same application: both write to
its `.next/` directory. Builds and tests do not require copying private credentials
into this repository. Native and release checks are in the
[release checklist](release-checklist.md).

## Common setup problems

| Symptom | Check |
| --- | --- |
| MMS database configuration missing | Configure `apps/operations/.env.local`, then restart |
| Staff account sees no site | Verify the intended database and authorised site membership |
| AI request unavailable | Check server-side provider configuration and error response |
| Visitor report cannot be sent | Check reporting mode, catalogue availability and intended backend |
| iOS shared bundle missing | Install mobile dependencies and generate the shared export first |
| Address already in use | Stop the existing process on port 3100 or 3200 before restarting |
