# Release checklist

Record the commit, build identifier, target environment, tester, date and known
limitations for every release. Mark checks as passed, failed or not run, with
evidence. A successful build alone is not feature acceptance.

## Automated checks

- [ ] Repository documentation checks pass.
- [ ] Changed web applications pass tests, TypeScript checks and production builds.
- [ ] Mobile changes pass relevant UI and native tests.
- [ ] Shared asset or native bridge changes build on both Android and iOS.
- [ ] Database changes include reviewed migrations and access-isolation checks.

## Visitor acceptance

- [ ] Discovery, Yatrik, recognition, narration and Explore work on target devices.
- [ ] Camera, microphone and location denial have usable recovery paths.
- [ ] Offline, weak-network and unavailable-provider behavior is clearly communicated.
- [ ] Report submission, retries, private receipt status and staff review are verified.
- [ ] Content sources, image credits and reconstruction labels have been reviewed.
- [ ] Marketplace demos and live payment behavior remain clearly distinguishable.

## Operations acceptance

- [ ] Staff sessions and site permissions are enforced beyond the interface.
- [ ] Evidence access, incident transitions and audit records are verified.
- [ ] AI advice cannot silently become a confirmed incident or autonomous enforcement.
- [ ] Synthetic, stale, unavailable and live readings are visibly distinguished.
- [ ] No local JSON store or simulated identity is used as production infrastructure.

## Deployment acceptance

- [ ] Private keys are absent from committed files and distributed client bundles.
- [ ] The selected environment, migration history and service configuration are recorded.
- [ ] Backup/restore and rollback procedures are appropriate to the release.
- [ ] Public URLs and key journeys are checked after deployment.
- [ ] Known limitations and support ownership accompany the release.

Site pilots additionally require written site permission, route safety review,
camera compatibility checks and agreed measurement definitions. See the
[roadmap](../product/roadmap.md).
