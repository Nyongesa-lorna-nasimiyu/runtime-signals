# Backup and recovery

Date: 2026-08-28

## Recovery objectives

- Published content: RPO 0 for merged Git content; RTO 60 minutes for a known-good redeploy after an available hosting account.
- Editorial history: RPO 24 hours for repository mirror/export; retain Git history and a second protected remote when approved.
- Newsletter state: provider is authoritative; export active, unsubscribed, bounced, complained, and suppressed records monthly before scale. Target RPO 30 days until a local ledger is justified.
- Analytics: aggregate reports are sufficient; a temporary measurement gap is acceptable.

## Procedures

1. Tag every production deployment with commit SHA and artifact manifest.
2. Keep generated search index, sitemap, feed, and checksum as CI artifacts for the retention period.
3. Mirror the repository to a separate protected location only after explicit approval; do not copy secrets.
4. Export newsletter data using provider controls, encrypt it, restrict access, record checksum, and delete working copies after verification.
5. Test restoration quarterly by building from a clean clone and deploying to a non-production Worker environment.
6. Test emergency unpublish by removing or changing content in Git, rebuilding, and validating `410`/redirect policy.

No backup is a substitute for provider suppression reconciliation. Never restore an old subscriber export over newer unsubscribe or complaint events without comparing event timestamps and states.
