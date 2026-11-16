<div align="center">
  <img src="apk/ui/public/sanskriti-mark.png" alt="Sanskriti AI" width="112" />
  <h1>Sanskriti AI</h1>
  <p><strong>Discover India's Living Heritage.</strong></p>
  <p>AI-powered heritage experiences. Connected monument operations.</p>
  <p>
    <a href="docs/product/overview.md">Product</a> ·
    <a href="docs/engineering/getting-started.md">Get started</a> ·
    <a href="docs/architecture.md">Architecture</a> ·
    <a href="docs/product/roadmap.md">Roadmap</a> ·
    <a href="CONTRIBUTING.md">Contribute</a>
  </p>
</div>

[![Operations checks](https://github.com/VandanMittal28/SMART-SANSKRITI/actions/workflows/operations.yml/badge.svg)](https://github.com/VandanMittal28/SMART-SANSKRITI/actions/workflows/operations.yml)
[![Repository checks](https://github.com/VandanMittal28/SMART-SANSKRITI/actions/workflows/repository.yml/badge.svg)](https://github.com/VandanMittal28/SMART-SANSKRITI/actions/workflows/repository.yml)

Sanskriti AI connects the experience of visiting heritage with the work of caring
for it. Visitors can discover monuments, ask **Yatrik** for guidance, explore
stories and routes, learn through quizzes and hunts, and discover local artisans.
The **Monument Management System (MMS)** brings site teams a separate workspace
for reviewing incidents, coordinating responses and recording outcomes.

Built by **Team Smart Sanskriti** for the Heritage & Culture theme of
**Smart India Hackathon 2026** · Problem statement **SIH26197** · Team **145319**.

> **Development status:** visitor beta and management platform in development.
> This repository contains implemented features, configuration-dependent services
> and explicitly synthetic demonstrations. Source availability does not establish
> production readiness, official partnerships or measured detection accuracy.

## The platform

| Experience | What it provides | Current scope |
| --- | --- | --- |
| **Android & iOS** | Recognition, Yatrik, audio stories, Explore, Treasure Hunt, quizzes, Time Travel and artisan experiences | Shared visitor UI with native device integrations; physical-device and release acceptance remain required |
| **Visitor website** | Browser-based discovery, recognition, Explore, Yatrik and voluntary issue reports | Implemented Next.js application; AI and hosted reporting require configured services |
| **Monument management** | Site-scoped staff access, incident workflow, audit history and manager-requested AI review | Implemented application and database migrations; deployment and site acceptance are separate steps |
| **Crowd pilot** | Scenario replay, crowd freshness, incident response and advisory previews | Synthetic simulation; live camera ingestion and verified occupancy remain future work |

### From discovery to understanding

- **Recognise and ask:** camera-assisted monument identification and contextual questions with Yatrik.
- **Explore and listen:** maps, location and heading guidance, stories and spoken narration.
- **Play and learn:** treasure hunts, quizzes, progress and interpretive historical scenes.
- **Support living heritage:** artisan discovery, crafts and workshop reservation flows; commerce needs separate live acceptance.
- **Report and respond:** voluntary visitor reports, staff review, assignment and recorded resolution.

Historical reconstructions are interpretations. AI assessments support human review.
Official ticket links do not make Sanskriti an official ticket issuer.

## Quick start

Use **Node.js 22.18+** (Node 22 is used in CI), npm, and Git.

```sh
git clone https://github.com/VandanMittal28/SMART-SANSKRITI.git
cd SMART-SANSKRITI
npm ci
npm run dev:operations
```

For a configuration-free demonstration, open
**http://127.0.0.1:3100/taj-pilot**. This local route uses synthetic scenarios.
The management screen at `/` requires database configuration and an authorised
staff account; see the [setup guide](docs/engineering/getting-started.md).

To run the visitor website in another terminal:

```sh
npm ci --prefix apps/visitor-web
npm run dev:visitor
```

Open **http://127.0.0.1:3200**. The guide can be explored without provider keys;
live AI and reporting have [explicit configuration requirements](apps/visitor-web/README.md).

| Build target | Start here |
| --- | --- |
| Android | [Android build and device setup](apk/README.md) |
| iOS | [Xcode, shared bundle and signing](ios/README.md) |
| Shared mobile UI | [Mobile interface development](apk/ui/README.md) |
| Visitor website | [Website setup and service modes](apps/visitor-web/README.md) |
| Management console | [MMS setup and workflows](apps/operations/README.md) |

## Repository structure

```text
SMART-SANSKRITI/
├── apps/
│   ├── visitor-web/       Visitor website and server routes
│   └── operations/        Management console, APIs and crowd pilot
├── apk/
│   ├── app/               Android shell and device integrations
│   └── ui/                Visitor UI shared by Android and iOS
│       └── supabase/      Marketplace migrations and functions
├── ios/                   Swift shell, device services and Xcode project
├── supabase/migrations/   Monument management database migrations
├── docs/
│   ├── product/           Product overview, roadmap and project references
│   └── engineering/       Setup, repository conventions and release checks
├── scripts/               Repository checks, pilot acceptance and document tools
└── .github/               CI, issue forms and pull-request template
```

The root npm workspace owns `apps/operations`. The website and mobile UI retain
independent lockfiles. Native bundle paths are intentional shared build contracts;
see the [repository guide](docs/engineering/repository-layout.md).

## Technology

| Layer | Technologies |
| --- | --- |
| Web interfaces | TypeScript, React, Next.js |
| Mobile UI | Tailwind CSS, Radix UI, Leaflet |
| Native clients | Java / Android SDK / Gradle; Swift / WKWebView / Apple device services |
| Data and identity | Supabase Auth, PostgreSQL, Storage and database access policies |
| AI and speech | NVIDIA integrations with additional Groq and Gemini adapters; device speech services |
| Quality | Node test runner, TypeScript, native tests and GitHub Actions |

Exact dependencies and provider selection belong to each application's source
and configuration. See the [architecture](docs/architecture.md) for service boundaries.

## Quality and contribution

```sh
npm run check:docs
npm run test:operations
npm run typecheck:operations
npm run build:operations
npm run test:visitor
npm run typecheck:visitor
npm run build:visitor
```

Install each target's dependencies before checking it. Mobile checks and manual
acceptance are described in [Contributing](CONTRIBUTING.md) and the
[release checklist](docs/engineering/release-checklist.md).

Browse the [documentation index](docs/README.md), open a reproducible
[bug report](https://github.com/VandanMittal28/SMART-SANSKRITI/issues/new?template=bug_report.yml),
or propose an improvement. Report sensitive findings privately as described in
[Security](SECURITY.md).

## Project references and rights

The product narrative draws on the supplied SIH submission and detailed project
report, reconciled with the current source. [Source notes](docs/product/overview.md#source-notes)
record their dates and scope. The [roadmap](docs/product/roadmap.md) describes
future NFC/QR checkpoints, site integrations and pilot acceptance.

No repository-wide open-source licence has been declared. Public visibility is
not a licence grant. Third-party media, fonts and packages retain their own
licences and attribution requirements; see [asset guidance](docs/engineering/repository-layout.md#assets-and-rights).
