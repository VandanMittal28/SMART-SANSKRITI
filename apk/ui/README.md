# Shared mobile visitor interface

This Next.js/React application supplies the visitor screens packaged by both the
Android and iOS shells. Android's build script produces a static export under
`apk/app/src/main/assets/www`; iOS copies and validates that export through its
bundle phase. Server routes are excluded from the mobile export.

## Install and check

From the repository root:

```sh
npm ci --prefix apk/ui
npm test --prefix apk/ui
(cd apk && ./scripts/build-mobile-ui.sh)
```

For browser UI development, use `npm run dev --prefix apk/ui`. Browser preview
does not provide native camera, narration or navigation bridge parity by itself.
Use the native clients to validate those integrations.

## Structure

- `app/` and `components/`: visitor screens and shared interface elements.
- `lib/` and `hooks/`: feature logic, content and integration adapters.
- `public/`: bundled media and brand assets.
- `supabase/`: marketplace migrations and server functions.
- `tests/`: application behavior and contract tests.

This package has its own lockfile. It is not part of the root operations workspace.
Keep its path stable until a cross-platform packaging migration is verified.
Configuration starts from `.env.example`; never commit local credential files.

See [Android](../README.md), [iOS](../../ios/README.md), and the
[repository architecture](../../docs/architecture.md).
