# Sanskriti

Connected heritage experiences and monument operations: a visitor app, a planned
NFC/QR visitor website, and a separate staff console.

## Repository map

```text
apps/operations/     Staff console and local operations API (Next.js)
apk/                Android native app and its build configuration
  ui/               Shared visitor interface currently packaged into both apps
ios/                iPhone shell, device services and Xcode project
docs/
  product/          Product vision PDF and implementation plan
scripts/            Reproducible document tooling
.github/workflows/  Automated operations checks
```

The native paths stay stable because their build steps reference each other.
The operations app is an npm workspace. The existing visitor UI retains its own
package/lockfile and Android packaging pipeline; it is not an operations dependency.

## Start the management console

Use Node 22.18+:

```sh
npm ci
npm run dev:operations
```

Open **http://127.0.0.1:3100**. The local sandbox includes a dashboard,
incident review/assignment/resolution, field staff views, sample zone crowd
signals and a report export. Its synthetic records are saved locally.

This is not a production staff login or a live camera system. See
[operations setup and boundaries](apps/operations/README.md).

```sh
npm run test:operations
npm run typecheck:operations
npm run build:operations
```

## Visitor apps

- **Android:** `cd apk && ./gradlew assembleDebug`. Output:
  `apk/app/build/outputs/apk/debug/app-debug.apk`. See [Android](apk/README.md).
- **iOS:** open `ios/SanskritiAI.xcodeproj`. Current runtime uses the bundled
  shared interface. See [iOS](ios/README.md) and the current-state review below.

## Product documentation

- [Product vision, current status and PRD (PDF)](docs/product/Sanskriti-Product-Vision-Status-and-PRD.pdf)
- [Detailed implementation plan and iOS assessment](docs/product/implementation-plan.md)
- [Architecture and delivery boundaries](docs/architecture.md)
- [Crowd input pipeline and local simulation](docs/crowd-inputs.md)
- [Implementation status and verified checks](docs/operations-status.md)
- [Contribution and verification guide](CONTRIBUTING.md)

Current milestone: a verified **local operations foundation**. Next: genuine
site/staff access, transactional storage, evidence, consented zone presence,
camera gateways and authorised ticket integration. Feature source is not the
same as accepted production behavior.
