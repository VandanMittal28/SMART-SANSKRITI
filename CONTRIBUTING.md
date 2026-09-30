# Working on Sanskriti

Use Node 22.18+ for the operations workspace. Install from the repository root
with `npm ci`; the root lockfile owns `apps/operations` dependencies. The visitor
UI in `apk/ui` is independently built and keeps its existing lockfile.

Before changing the domain or API, run `npm run test:operations`. Before a push,
also run `npm run typecheck:operations` and `npm run build:operations`. For UI
changes, verify desktop and mobile layouts and at least one full user journey.

Keep credentials, local databases, generated bundles, IDE user state and local
service metadata out of Git. Never put provider keys in browser code. Add new
sample data as explicitly synthetic examples. Do not describe an unconnected
screen as a working external integration.

Changes to Android/iOS shared bundle paths require both platform build checks.
Avoid repository-wide moves while those packaging dependencies are still in
place. Record architecture choices in `docs/` and update the relevant README.
