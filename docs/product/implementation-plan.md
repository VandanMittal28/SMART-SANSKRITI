# Sanskriti implementation plan and iOS completion review

Prepared 30 September 2026. This is a proposed delivery plan grounded in the current repository, not a claim that the planned platform is already implemented.

## 1. Recommended direction

Keep the shared visitor interface and finish its iOS integration. Build a separate responsive monument operations console and a lightweight NFC/QR visitor website, backed by shared content and application services. Deliver a complete reporting-and-response workflow before adding camera intelligence.

The initial release should serve one monument, five checkpoints, Hindi and English, one Explore route, a five-stage Hunt, existing-ticket validation, and a small staff team. Add 4–10 compatible cameras only after one camera works reliably. Restrict the initial AI evaluation to crowd thresholds and restricted-zone entry.

Do not make iOS completion depend on CCTV, government ticketing integration, a fully native screen rewrite, or production marketplace payments. Those are distinct delivery tracks.

## 2. Where iOS stands today

**Assessment: a buildable hybrid prototype with shared screens, incomplete service/device integration, and unverified release readiness.** A meaningful completion percentage cannot be assigned until the release feature list and physical-device acceptance results exist.

| Area | Evidence in the repository | Status and implication |
|---|---|---|
| Build | Fresh unsigned Debug simulator build succeeded using installed Xcode 27.0 | Compilation verified; installation, runtime, signing and distribution were not tested |
| App entry | `SanskritiAIApp.swift` opens `RootView`, which opens `SanskritiWebView` | The active product is the bundled web interface inside WKWebView |
| Shared UI | Xcode copies `apk/app/src/main/assets/www`; existing bundle is approximately 68 MB | Extensive screens are reusable, but Xcode does not rebuild the editable web source |
| Local loading | `WebView.swift` starts an HTTP file server at `127.0.0.1` on an automatically assigned port | Handles static assets, not server API execution; startup failure has no user-facing recovery |
| Native screens | Home, Explore, Chat and Recognition scaffolding exists in `Views.swift` | These screens are not the active root experience; audio/photo actions and other native feature screens include placeholders |
| AI integration | Swift API and NVIDIA clients exist; web native bridge expects `window.SanskritiAndroid` | No WKScriptMessageHandler wiring connects the displayed UI to the Swift clients |
| Server routes | Mobile export explicitly excludes `app/api`; web UI uses relative `/api/...` calls | Relative recognition/transcription/translation and other server calls cannot execute through the local static server |
| API consistency | Web chat fallback uses `/chat/ask` on a legacy default backend; current route source uses `/api/chat` | Resolve contracts and deployment before claiming live AI parity; legacy backend availability was not tested |
| Location/navigation | CoreLocation and bearing calculations exist; shared UI also has navigation code | Native controller is not bridged into the displayed web experience; compass, permission and arrival behavior need phone testing |
| Accounts | Bundled-mode detection includes localhost; auth context uses local profiles in that mode | Local sign-in is not verified cloud identity or staff authorization |
| Marketplace | Bundled mode selects demo listings and local reservation paths | Treat as demonstration, not working production commerce |
| Persistence | Web local profiles use localStorage; native profiles use UserDefaults separately | Random-port origins risk making previous web storage inaccessible after relaunch; reproduce and fix before relying on saved progress |
| Tests | NavigationMathTests.swift exists; project has one application target and no test target | These tests are not wired into the shared scheme and were not run |
| Release assets | No iOS asset catalog, entitlements file or privacy manifest found in the inspected iOS tree | Complete applicable release assets and declarations; absence of entitlements alone does not prove a defect |
| Documentation | iOS README describes a native client; configuration README permits temporary direct NVIDIA calls | Update docs to describe the actual hybrid architecture and production configuration |

### Verification boundary

The build used `xcodebuild -project ios/SanskritiAI.xcodeproj -scheme SanskritiAI -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/sanskriti-ios-plan-build CODE_SIGNING_ALLOWED=NO build` and exited successfully. The log reported an App Intents metadata warning, not a compilation error. Build log: `/tmp/sanskriti-ios-plan-build.log`.

No simulator was booted during the check. No physical iPhone, camera session, live AI request, deployed Supabase state, payment, signed archive, App Store Connect account or TestFlight release was verified. Repository code can establish implementation presence; it cannot establish a functioning production service.

## 3. How to finish iOS

### I1 — Freeze the release and make packaging reproducible

**How:** Retain WKWebView for the first release. List the screens that must work: local/guest onboarding, monument content, recognition, Yatrik chat, narration, Explore, Hunt and saved progress. Decide explicitly whether cloud accounts are required. Keep unfinished commerce visibly in demo mode or outside the release navigation. Make a single build pipeline export the shared UI and package exactly that export into Android and iOS. Record source revision and asset version in a build manifest. Fail packaging when required assets are missing or stale. Update both READMEs.

**Complete when:** A clean checkout can produce the same app assets without manually copying an old Android build. The team agrees on a feature acceptance checklist.

### I2 — Repair API connectivity before polishing screens

**How:** Inventory every request made by released screens. For each, record URL, method, authentication, request/response types, owning service, timeout and offline behavior. Create one runtime API client using a configured HTTPS server. Reconcile `/chat/ask` and `/api/chat`. Provide recognition and other missing endpoints if they remain in release scope. Keep the local server responsible only for bundled content. Choose either authorized direct HTTPS calls with a carefully scoped CORS policy or a narrow native network bridge; do not use an arbitrary URL proxy.

Production configuration must be packaged as non-secret configuration or fetched from a trusted service. Xcode Run-scheme environment variables are not a production configuration mechanism. Keep provider credentials on the server and remove the direct-provider path from release builds. Add request limits, input validation and errors that distinguish unavailable service from curated offline content.

**Complete when:** The installed app, launched without Xcode, can submit a real question and photo through the intended backend, handle timeout/invalid data, and show a clear offline response. No provider secret is in the client bundle.

### I3 — Add an explicit iOS device adapter

**How:** Introduce a platform-neutral device interface with Android, iOS and browser implementations. Use WKScriptMessageHandler for iOS operations that need native support: camera/photo selection, recording, location/heading, speech, sharing and persistent local state. Each request needs a request ID, validated parameters, completion/error response, cancellation and timeout. Accept calls only from the app's trusted content/frame. Use browser APIs where they are proven to work; do not assume every Android bridge operation needs duplication.

Add WK navigation and UI delegates for loading errors, external links and permission handling. Apple's [media permission delegate](https://developer.apple.com/documentation/webkit/wkuidelegate/webview(_:requestmediacapturepermissionfor:initiatedbyframe:type:decisionhandler:)) is the reference for web capture permission decisions.

**Complete when:** Every supported action has a capability check and working success, denial and cancellation paths on an iPhone. Unsupported actions show a useful alternative.

### I4 — Make startup, storage and lifecycle dependable

**How:** Show loading, failure and retry states. Recover when the WebKit process terminates or the app resumes. Ensure the local listener is restricted to loopback; the current listener does not explicitly require that interface. Replace broad arbitrary network allowances with the exceptions actually needed. Allow external links only through deliberate navigation rules.

Test storage across changing localhost ports. Prefer app-owned persistent storage behind a narrow bridge, with Keychain for authentication secrets and files/database for progress. A persistent WKWebsiteDataStore alone does not make localStorage independent of origin. Migrate existing local data if needed. Handle background/foreground transitions and stop audio, camera and location use appropriately.

**Complete when:** Profile, language and Hunt progress survive ten force-quit/relaunch cycles and a bundle update. There is no indefinite blank screen after startup failure.

### I5 — Complete the visitor journeys on a real phone

| Journey | Implementation work | Acceptance check |
|---|---|---|
| Recognition | Capture/select image, compress, upload, parse validated response, show unknown/low-confidence state | Valid monument, unrelated photo, large image, denied permission and offline request behave correctly |
| Yatrik voice | Record with explicit start/stop; send correct audio format; transcribe; answer; narrate | English/Hindi question works; headphones, interruption, cancellation and denied mic are handled |
| Explore | Feed position, accuracy and heading into the active UI; validate trueHeading before fallback; unsubscribe on exit | Outdoor route works with weak GPS and denied location; arrival is not awarded solely from a noisy reading |
| Hunt | Version content and checkpoints; persist progress; validate answers/rewards according to chosen trust model | Resume mid-Hunt and prevent duplicate completion rewards |
| Offline content | Bundle reviewed text/media; cache a selected route; label live-only features | Airplane mode still permits the promised content journey |
| Layout/accessibility | Fix safe-area and keyboard overlap; support readable text sizes and accessible controls | Small and large iPhones can complete each released journey |

The native navigation scaffold currently enters “live” immediately after requesting location, and its fallback state needs a deliberate recovery path if reused. The native camera preview also needs permission and teardown handling before being reused. These observations do not establish how the currently displayed web navigation behaves.

### I6 — Add meaningful verification and prepare distribution

**How:** Add an XCTest target, wire it into the scheme, and import the app module for the existing bearing tests. Add checks for API parsing, bridge errors, persistence and critical launch/navigation flows. Build an unsigned Release variant, then a signed device archive with the configured team's valid credentials. Add an app icon, support/privacy URLs, screenshots, review notes and applicable privacy manifest declarations. Check actual API/data use before filling declarations.

Use [Apple's privacy manifest documentation](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk) for required-reason APIs and SDK declarations. Follow [Apple's submission checklist](https://developer.apple.com/app-store/submitting/) and [TestFlight workflow](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/) for distribution.

**Complete when:** Required journeys pass on at least two physical iPhones, including the minimum supported OS where available; no unresolved blocker remains; a signed build installs through TestFlight and works without Xcode. App Review acceptance is a separate external outcome.

**Planning estimate:** Approximately 4–6 weeks for an experienced iOS/shared-UI engineer with backend help, once service access and release scope are settled. Budget longer if cloud identity, payments or a fully native rewrite are added. This is an effort assumption, not a completion forecast.

## 4. Monument platform architecture

Use three visitor/staff surfaces: the installed app, a public checkpoint website, and a staff console with a guard-friendly layout. Reuse reviewed content and design components rather than exposing every app screen on the public website.

Recommended foundation: the existing React/Next.js experience for web surfaces, one shared application API, Supabase Auth/Postgres/private object storage for identity and records, and a background job worker for notifications, escalations and reports. Keep camera processing in a separate on-site gateway. Validate this choice against site connectivity, support capacity and measured camera workloads before buying hardware.

Suggested new workspace boundaries are `apps/visitor-web`, `apps/operations`, `services/api`, `services/camera-gateway`, and `packages/contracts`/`packages/heritage-content`. These are proposed paths, not existing components. Avoid a large repository move until the first end-to-end workflow works.

### Data boundaries

Define organizations, sites, zones, staff memberships, checkpoints, content versions, visit sessions, checkpoint events, camera registrations, alerts, incidents, assignments, incident history, evidence objects, ticket references, admission events, maintenance tasks and daily reports. Inspect existing `heritage_sites` records before extending or mapping them; do not create conflicting site identities.

Every operational record needs organization/site scope. Enforce membership and permitted actions in the backend and database; a UI role switch or marketplace admin flag is insufficient. Keep evidence private, issue short-lived authorized links, and audit access and state changes. Use idempotency keys for camera events, ticket scans, rewards and offline resubmission. Define site timezone and server timestamps consistently.

Supabase [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security) should restrict exposed operational tables by organization/site membership. Test that a valid user from site A cannot read, write or subscribe to site B. Keep privileged credentials server-side. Use migrations and staging validation; do not infer deployed schema from migration files alone.

## 5. Module-by-module implementation

### M1 — Site discovery and measurable pilot scope

**How:** Interview five managers and five security staff; visit up to three candidates. Record incident categories, escalation contacts, current tickets, entry/exit coverage, camera make/stream support, bandwidth, power, staff devices and installation permissions. Select one operational owner and one budget owner. Obtain sample tickets and authorized camera access. Record baseline response times and staff workload.

**Deliverables:** Signed pilot scope, site/zone map, camera inventory, responsibilities, retention choices, support hours and agreed acceptance criteria. No hardware commitment before a feed compatibility test.

### M2 — Staff accounts and site configuration

**How:** Create organization/site membership records; invitations and role assignment; manager, supervisor, guard, ticketing and read-only roles. Add zone/checkpoint configuration and audit records. Enforce MFA for privileged staff where adopted. Separate anonymous visitors from staff authentication. Test revoked membership and expired sessions.

**Complete when:** Two test organizations are isolated, a guard sees only authorized assignments, and changes are attributable to staff identities.

### M3 — Incident workflow first

**How:** Build the states reported → under review → dismissed or confirmed → assigned → acknowledged → in progress → resolved → closed. Specify who can perform each transition, reopening rules and required notes. Create a review queue, incident detail page, assignment controls and guard “acknowledge/start/resolve” actions. Add evidence upload, duplicate-report linking and priority escalation. Deliver in-app notifications first, with another staff channel only after the site selects it.

**Complete when:** A manually created report travels from submission to closure with one accountable owner, timestamps and evidence. Retry must not create a second incident. Overdue priority incidents reach the supervisor.

### M4 — Visitor reporting

**How:** Let a visitor choose a category, checkpoint/zone and optional photo, preview the report and explicitly submit it. Allow manual location correction rather than relying only on GPS. Restrict file types and size, check upload completion, rate-limit submissions and record submission status. Queue offline drafts and tell the visitor when they have actually been delivered. Do not present this as an emergency service.

**Complete when:** The report reaches the correct site's staff queue and remains unverified until reviewed. The visitor cannot see internal evidence or other visitors' submissions.

### M5 — NFC/QR website and content

**How:** Publish an HTTPS checkpoint URL with stable site/checkpoint IDs; encode the same URL in NFC and printed QR. Offer language selection, anonymous start, story/audio, next safe checkpoint and Hunt clue. Publish versioned content with source/reviewer metadata. Cache essentials and retain local progress. Add a staff screen to disable/replace plaques without losing history. Use signed or opaque checkpoint references and server-side reward deduplication; ordinary static links do not prove physical presence.

**Complete when:** Visitors on Safari and Android Chrome complete all five checkpoints in both languages without installing an app. A broken connection preserves progress, and a copied URL cannot mint repeated valuable rewards.

### M6 — Ticket validation and occupancy

**How:** Start with authorized ticket import or an existing provider API. Define valid, used, cancelled, expired, wrong-site and wrong-slot responses. Validate and record admission atomically so two scanners cannot admit the same ticket concurrently. Define re-entry and exit rules. Record staff overrides with reasons. During a connection loss, display that admission is unverified or apply a site-approved offline procedure; never silently call it verified.

Compute occupancy from opening count plus accepted entries minus recorded exits, with reconciliation and a visible data-quality state. Show camera estimates separately until calibrated. Do not promise official government ticket sales integration without access and agreement.

**Complete when:** Duplicate/concurrent scans are rejected correctly and the dashboard explains missing exits or stale counts.

### M7 — CCTV gateway and camera health

**How:** Connect one authorized compatible stream using the camera's supported interface. Keep credentials on the gateway. Add reconnect/backoff, frame timestamps, health heartbeat and a bounded local buffer. Send authenticated event metadata and selected short clips to the backend; use unique event IDs and a retry queue during outages. Add zone polygons and camera-offline status. Expand to 4–10 feeds only after measuring throughput, heat, bandwidth and reliability.

For an actual camera wall, add an authenticated streaming gateway and browser-compatible playback; raw camera streams cannot be assumed to play directly in the browser. Start with alert clips and camera health if continuous live viewing adds unnecessary pilot complexity.

**Complete when:** A disconnected camera is shown as offline, buffered events are delivered once after reconnection, and a staff member can view authorized evidence.

### M8 — Two narrowly defined detection categories

**How:** Define crowd thresholds by calibrated camera/zone counts and sustained duration; define restricted entry by polygon crossing and dwell rules. Select a detector/tracker after checking licensing and the site's sample footage. Evaluate on authorized clips with staff-labelled events, different lighting and occlusion, using separate evaluation footage. Deduplicate repeated alerts for the same event and configure cooldowns.

First run in observation-only mode. Measure reviewed precision, false alerts per camera-hour, missed events where ground truth exists, processing delay and reviewer workload. Have humans confirm every alert before assignment. Do not add generic “vandalism detection” until observable categories have labelled evidence and demonstrated reliability.

**Complete when:** The two categories meet agreed site thresholds without overwhelming staff. An AI alert is visibly distinct from a confirmed incident.

### M9 — Maintenance, dashboards and daily reports

**How:** Start with counts of open/overdue incidents, admissions, occupancy confidence and camera health. Generate a timezone-specific daily summary of confirmed versus dismissed alerts, acknowledgement/resolution times and unfinished work. Define all denominators and missing-data behavior. Derive conservation tasks from verified damage, with owner, due date, before/after evidence and approval. Add multi-site views after site-level access tests pass.

**Complete when:** A manager can reconcile a daily report to underlying records and cannot confuse no data with zero incidents. Maintenance closure includes evidence and an approver where required.

### M10 — Operations and rollout

**How:** Create staging and production environments, automated migrations, backup/restore procedures, health alerts, structured logs and deployment rollback. Rehearse an internet outage, gateway restart, duplicate event, unauthorized access and restore. Train staff using simulated incidents. Agree who responds to support requests, how urgent issues escalate and what happens if the service is unavailable.

**Complete when:** Staff can run a full shift, the team can recover from failure, and the pilot owner signs off the workflow and known limitations.

## 6. Delivery sequence and ownership

The 90-day sequence assumes roughly three engineering owners (mobile/shared UI, backend/web, video integration), part-time QA/content support, and a founder/site coordinator. With one developer, narrow scope further or extend the calendar; do not treat parallel work as free capacity.

| Period | Platform outcome | iOS work alongside it | Exit gate |
|---|---|---|---|
| Days 1–15 | Site discovery, baseline, roles/data design and manual incident prototype | I1–I2: release scope, repeatable assets, API contracts | One pilot sponsor; known service ownership; app's core online calls work |
| Days 16–30 | Accounts, visitor reports, assignment/closure; five-checkpoint web prototype | I3–I5: device integration, persistence and phone journeys | Report-to-resolution demo; phone restart and permission checks pass |
| Days 31–45 | Ticket validation, occupancy quality, daily reports and gateway prototype | I6: tests, signed archive, TestFlight preparation | iOS beta candidate; concurrent ticket scan and site isolation verified |
| Days 46–60 | One live camera, detector calibration, escalation and outage handling | Beta feedback and focused fixes | Complete camera-alert-to-resolution workflow in staging |
| Days 61–75 | Install checkpoints, expand compatible cameras, train staff, shadow analytics | Stabilize release | Acceptable observed accuracy/workload; staff can operate independently |
| Days 76–90 | Limited activation, weekly review, results and commercial conversion decision | Release only after mobile gates pass | Documented outcomes and buyer decision, or explicit extension with reasons |

Critical path: pilot access → identity/roles → incidents → evidence/gateway → detector evaluation → staff activation. Visitor web/content can proceed alongside incidents. iOS depends on the shared API and its own device verification, not the video pipeline.

## 7. Acceptance and measurement

Use the earlier targets as negotiation starting points, not measured achievements: 30% of eligible checkpoint sessions start an experience; 20% of starts complete the Hunt; median three checkpoints; under 10% fail for network/browser reasons; average collected satisfaction at least 4/5. Fix the completion denominator to starts for this plan and keep it consistent.

Operational proposals: acknowledge priority alerts within two minutes during staffed hours, at least 80% reviewed precision per selected category, an agreed false-alert ceiling per camera-hour, ownership/history for every confirmed incident, and useful daily reports. Agree sample size and evaluation duration before interpreting percentages. Include missed events when a labelled reference exists; precision alone is insufficient.

For iOS, completion means passing the agreed journeys and release gates, not having every menu item visible. Record device/OS, build revision, input, expected result, actual result and evidence for each failed journey.

## 8. Costs and commercial completion

Prepare separate one-time and recurring budgets. One-time: discovery, content, plaques, gateway hardware, camera integration, installation and training. Recurring: API/AI usage, database/storage, evidence retention, messaging, gateway maintenance and support. Measure cost per active visitor, camera-hour and site-month. Price only after a workload test and vendor quotations.

The earlier ₹3–8 lakh pilot and ₹6–18 lakh annual site licence remain hypotheses. A useful pilot proposal defines payment, scope, support, hardware ownership, data responsibilities, acceptance and conversion terms. Begin with a reachable museum/trust/private heritage operator before relying on large public procurement.

## 9. Immediate task list

1. App owner: agree the first iOS feature checklist and adopt the hybrid completion path.
2. Mobile/backend owners: document every active API request and fix shared HTTPS routing.
3. Mobile owner: rebuild/export shared assets reproducibly; add launch diagnostics and persistent app storage.
4. Mobile owner: implement the required iOS device adapter and test camera, microphone, location and narration on a phone.
5. QA owner: add the missing test target and record the first physical-device acceptance run.
6. Backend/web owner: create a staging-only organization/site/incident workflow and prove tenant isolation.
7. Founder/site coordinator: choose a pilot site and obtain camera/ticket samples and staff participation.
8. Web/content owner: publish one reviewed checkpoint journey; expand to five after field feedback.
9. Video owner: connect one camera and collect evaluation evidence before selecting gateway hardware for all feeds.
10. Project owner: review acceptance evidence weekly and remove optional scope whenever core delivery slips.

## Evidence index

Repository sources inspected: `ios/SanskritiAI/{SanskritiAIApp,Views,WebView,Services,DeviceServices,Models}.swift`, `ios/SanskritiAI/Info.plist`, Xcode project and shared scheme, `ios/Tests/NavigationMathTests.swift`, iOS READMEs, `apk/scripts/build-mobile-ui.sh`, `apk/ui/next.config.ts`, `apk/ui/lib/{apiClient,nativeNvidia,localSession,authContext}.ts*`, Supabase client, marketplace client, server route sources and migration filenames/table declarations. Earlier scope comes from `output/project-report/report.md`, chapters 22–27. Proposed architecture, tasks, staffing and estimates are recommendations made for this plan.
