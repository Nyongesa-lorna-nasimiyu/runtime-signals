# External-service runbook

Date: 2026-08-28

This runbook is preparatory. No accounts, DNS records, production keys, or email sends are authorized by it.

## Before activation

- Recheck current pricing, quotas, DPA, subprocessors, export format, status page, API version, and rate limits.
- Record account owner, billing owner, recovery email, MFA method, support contact, and cancellation/export path.
- Use a dedicated sending subdomain for newsletter DNS; verify SPF, DKIM, DMARC, Return-Path, and tracking configuration in a test environment.
- Create test content and test subscribers only; never use real personal data in a proof of concept.
- Add provider adapter contract tests and an outage fallback before enabling the public form.

## Incident sequence

1. Declare the affected dependency and preserve timestamps/request IDs.
2. Disable only the failing feature if needed; keep article reading live.
3. Check provider status, quotas, authentication, and recent secret/config changes.
4. Do not retry non-idempotent sends blindly. Use event IDs/idempotency keys.
5. Reconcile from provider export/API after recovery.
6. Record user-visible gap, affected window, data-loss assessment, and follow-up.

## Exit sequence

Export subscribers including suppression/consent state, export templates and delivery metadata where permitted, freeze the old provider, import into the replacement, run a reconciliation, and only then change the form endpoint. Preserve unsubscribe and complaint states; never send to an address that exists only in an old active-list export.
