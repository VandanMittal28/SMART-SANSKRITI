# Repository layout and conventions

## Application ownership

| Path | Responsibility | Dependency installation |
| --- | --- | --- |
| `apps/operations/` | Staff console, operations APIs and crowd demonstrations | Root `npm ci`; root lockfile owns this workspace |
| `apps/visitor-web/` | Visitor website and its server endpoints | `npm ci --prefix apps/visitor-web` |
| `apk/ui/` | Shared mobile screens, content and integration adapters | `npm ci --prefix apk/ui` |
| `apk/app/` | Android shell, permissions and native services | Gradle wrapper under `apk/` |
| `ios/` | iOS shell, device services, signing and native tests | Xcode project plus the shared UI export |
| `supabase/migrations/` | MMS schema and access-policy history | Review against the intended database before applying |
| `apk/ui/supabase/` | Marketplace schema and server functions | Separate domain and deployment history |

The mobile UI deliberately remains at `apk/ui/`: Android's export script and iOS's
bundle phase share this path. Moving it requires a dedicated migration verified on
both platforms. Moving database migrations can also break deployment history.
Do not reorganise either simply for a more symmetrical folder tree.

## Within an application

- `app/`: routes, layouts and request handlers.
- `components/`: user-interface elements and interactions.
- `lib/`: domain behavior, data adapters and services; web secrets belong in server modules.
- `tests/`: behavior and contract checks.
- `public/`: shipped assets, with provenance and attribution where needed.

Keep cross-app contracts explicit. The website has adapted mobile code; it does
not automatically receive subsequent changes to `apk/ui`. Review affected copies
when changing shared concepts such as narration payloads or report receipts.

## Documentation and generated files

Put product narratives and roadmaps in `docs/product/`, and reusable engineering
instructions in `docs/engineering/`. Keep dated delivery records identifiable as
historical evidence. The [documentation index](../README.md) is the entry point.

`output/`, `tmp/`, installed dependencies, generated native bundles, local data,
credentials and IDE state are not source deliverables. Deliberately curate any
public project artifact before adding it to `docs/`. Keep the existing lockfile
for each package; do not generate an additional workspace lockfile.

## Assets and rights

Use existing brand assets in `apk/ui/public/`. Monument photographs, generated
historical scenes, narration and third-party fonts have distinct provenance.
Preserve credits in source and in the user interface. Review historical accuracy
and media rights before release. A generated reconstruction is not documentary
proof of a monument's historical appearance.

There is no repository-wide open-source licence. Do not apply a licence or claim
ownership of third-party material without an explicit project-owner decision.
