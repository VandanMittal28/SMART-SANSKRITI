# Security

Sanskriti AI is under active development. There is no declared supported-release
matrix or security-response SLA. Use the current source and release evidence when
assessing deployment readiness.

## Report a sensitive finding

Do not post credentials, personal records, private report receipts or exploitable
vulnerability details in a public issue. If GitHub private vulnerability reporting
is enabled, use the repository's **Security → Report a vulnerability** action.
If it is unavailable, ask a maintainer through the repository for a private contact
channel without including the sensitive details. No dedicated security inbox is
currently declared here.

A useful private report includes the affected commit and application, prerequisites,
minimal reproduction, expected and actual behavior, and impact. Use synthetic
accounts and records; redact secrets and personal information.

## Development boundaries

- Keep private provider, signing and service credentials outside version control.
- Public browser configuration is not an authorisation mechanism.
- Enforce staff and site access in backend/database policies, not visual role selectors.
- Keep local demo APIs, synthetic staff and file-backed stores out of public production use.
- Treat keys in Android/iOS bundles as extractable; use controlled server-side services for production.
- Treat AI assessments as advice requiring appropriate human review.

If a secret is exposed, revoke or rotate it at its provider. Deleting it from the
latest commit does not revoke it or erase repository history.
