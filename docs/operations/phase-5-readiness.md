# Phase 5 readiness record

Date: 2026-09-01

This is the evidence register for production-readiness work. It separates
repository-verifiable controls from rehearsals that require an operator with
Cloudflare, GitHub, or backup-account access. The baseline commit for this
review was `58fb545` on `main`.

| Area | Evidence | Status | Remaining action |
| --- | --- | --- | --- |
| Deployment credential | The previously exposed Cloudflare token was rolled by the account owner. No token is stored in Git. | Complete by operator confirmation | Record rotation date, scope, and next review in the credential inventory. |
| Deployment authority | `deploy.yml` is the only workflow that reads `CLOUDFLARE_API_TOKEN`; it is behind the `production` environment. GitHub Actions is the declared production authority. | Complete | Re-check Cloudflare dashboard Build settings after any infrastructure change so a second deploy path is not re-enabled. |
| Production approval | The protected `production` environment has a required reviewer and was exercised for real. | Complete by operator confirmation | Keep the reviewer independent of the change author where possible. |
| Dependencies | `npm ci` and `npm audit --audit-level=high` completed with 0 vulnerabilities at the baseline. Dependabot is now configured for npm and GitHub Actions. | Complete for this baseline | Review Dependabot PRs through the normal publication gate; do not auto-merge. |
| Action supply chain | All workflow Action references are full commit SHAs; `npm run verify:action-pins` now enforces this. | Complete | Keep SHA comments and Dependabot updates aligned. |
| Threat model / previews | Preview workflow has read-only contents permission, no production secrets, forced noindex metadata/robots, and real browser metadata, accessibility, and performance checks. | Structurally complete | There is no authenticated live preview; keep that deferred unless a concrete need appears. |
| Reproducibility | Two clean builds with the same `SOURCE_DATE_EPOCH` produced the same routes, HTML, metadata, feeds, and non-Pagefind assets. Pagefind 1.5.2 emitted different hashed chunk names/bytes between runs, so the indexer is the known nondeterministic boundary. | Partial, documented | Treat the Pagefind index as a derived deploy artifact; investigate upstream determinism before requiring byte-identical full `dist/` archives. |
| Domain / policy | Live HTTPS probes returned 200 for the home page, robots, sitemap index/shard, RSS, and Atom; a missing route returned the custom 404; trailing slashes redirect to canonical no-slash URLs. | Complete for current deployment | HSTS remains at the intentional 300-second bootstrap value; raise to one year only after continued stability. |
| Backup / export | Procedures and RPO/RTO targets are documented in `backup-and-recovery.md`. | Not rehearsed | Perform a clean-clone mirror/export and a non-production restore; do not copy secrets. |
| Rollback / correction | Git-based unpublish and redeploy procedure is documented. | Not rehearsed | Use Cloudflare deployment history to roll back a disposable/non-production target, then rehearse a content correction and verify 404/redirect behavior. |
| Observability | OTel is console-only by design. The new `production-health` workflow runs public read-only probes daily and on demand. | Partial | Configure GitHub failure notifications and a Cloudflare availability/log alert destination; assign a second incident contact. |
| Incident ownership | Primary route is the repository maintainer and `security@runtimesignals.tech`. | Partial | Name and verify an independent second contact before relying on external alerts. |

## Operator rehearsal commands

These commands are intentionally manual because they touch external account
state or backup locations:

```sh
# Repository backup integrity (use a separately protected destination).
git clone --mirror https://github.com/Nyongesa-lorna-nasimiyu/runtime-signals.git runtime-signals.git
git -C runtime-signals.git fsck --full

# Reproducibility smoke check from a clean checkout.
SOURCE_DATE_EPOCH=1788220800 npm ci
SOURCE_DATE_EPOCH=1788220800 npm run build
```

Cloudflare rollback and content correction must be performed through the
approved GitHub Actions path or the documented Cloudflare deployment history;
never paste a token into a shell command or restore a subscriber export over a
newer unsubscribe/suppression event. Newsletter implementation remains a
separate security decision.
