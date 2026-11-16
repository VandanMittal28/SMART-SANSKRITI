# Contributing to Sanskriti AI

Read the [setup guide](docs/engineering/getting-started.md) and
[repository layout](docs/engineering/repository-layout.md) before changing an app.
For a substantial feature, describe the user problem, affected surfaces and
acceptance criteria in an issue first.

## Development workflow

1. Branch from current `main` using a descriptive name such as `feat/visitor-audio`,
   `fix/report-retry` or `docs/setup`. Automation may use `codex/` branches.
2. Keep the change focused. Preserve unrelated local work and existing lockfile ownership.
3. Implement the user behavior with meaningful checks for changed contracts and failure cases.
4. Update the relevant application README and documentation index when setup or structure changes.
5. Open a pull request explaining the problem, resulting behavior, validation and limitations.

## Required checks

| Change | Verification |
| --- | --- |
| Documentation | `npm run check:docs`; review rendered Markdown |
| Operations | `npm run test:operations`, `npm run typecheck:operations`, `npm run build:operations` |
| Visitor website | `npm run test:visitor`, `npm run typecheck:visitor`, `npm run build:visitor` |
| Shared mobile UI | `npm test --prefix apk/ui`, relevant UI checks and affected native builds |
| Native bridge or bundle paths | Android and iOS build checks plus device behavior |
| Database/access policies | Intended migration history, role/site isolation and failure behavior |

Run commands from the repository root after installing each target's dependencies.
For UI changes, check narrow and wide layouts, keyboard interaction and a complete
user journey. Report checks that could not be run; do not imply they passed.

## Engineering standards

Keep private credentials, generated bundles, local data and IDE state out of Git.
Use `.env.example` files for variable names and safe defaults only. Keep private
provider keys server-side; a key embedded in a native app is extractable.

Label synthetic data and demonstrations. Do not present local reservations,
reconstructed imagery, AI suggestions or unavailable sensor readings as verified
transactions, history, findings or live telemetry. Preserve third-party attribution.

Use the existing application style and explicit runtime boundaries. Native build
paths and database migration histories require a separately verified migration
before moving. Avoid unrelated dependency updates in documentation changes.

## Reporting problems

Use the issue forms for reproducible bugs and feature proposals. Include the
application, commit, device/browser, expected behavior and minimal steps. Remove
credentials, private receipt tokens and personal data from logs and screenshots.
For sensitive findings, follow [SECURITY.md](SECURITY.md).

## Review and release

Keep discussions respectful and grounded in user impact. Reviewers should be able
to reproduce the change without the original chat. The
[release checklist](docs/engineering/release-checklist.md) defines shipping evidence.
The project has not declared a repository-wide open-source licence; contributions
do not change existing third-party rights or grant a new distribution licence.
