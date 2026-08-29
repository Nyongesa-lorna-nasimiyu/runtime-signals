# Incident response

Date: 2026-08-28

Status: preparatory. This defines the procedure to follow if a security control fails; it does not authorize any action, account, or notification on its own. Distinct from `docs/operations/failure-modes.md` (routine external-dependency outages) and `docs/operations/external-service-runbook.md` (newsletter-provider-specific sequence) - this file covers security incidents: compromise, unauthorized access, or unauthorized publication.

## Severity

| Severity | Definition | Example |
| --- | --- | --- |
| SEV1 | Confirmed unauthorized write access to the production artifact, repository, or a credential with deploy scope | Stolen deploy token used to push a non-reviewed artifact; GitHub account with merge rights compromised |
| SEV2 | Unauthorized or incorrect publication reached readers, or a secret was exposed, without confirmed further compromise | Draft or restricted content published by mistake; API key committed to a public branch |
| SEV3 | A control failed or a suspicious event occurred but no unauthorized state change is confirmed | Failed webhook signature spike; dependency flagged by a supply-chain scanner; forged-webhook attempt rejected |

## Response sequence (all severities)

1. **Declare and record.** Note detection time, affected system, evidence (commit SHA, request ID, audit-log entry, alert), and the person handling it. Do not delete evidence while investigating.
2. **Contain without destroying evidence.** Revoke or rotate only the specific credential/token involved; disable the specific failing feature (a form route, a scheduled workflow) rather than the whole site if reading is unaffected. Article reading must stay up unless the compromise is in the delivery path itself.
3. **Verify the last known-good state.** Identify the last commit SHA known to be reviewed and clean; do not assume the current deployed artifact is safe until checked against it.
4. **Recover.** Redeploy from the known-good SHA (SEV1/SEV2) or resolve in place (SEV3). Rotate every credential the affected token or account could have read, not only the one confirmed used.
5. **Reconcile.** For anything touching subscriber state, treat the newsletter provider as authoritative and reconcile via export/API per `docs/operations/external-service-runbook.md`, rather than trusting local state.
6. **Record the outcome.** User-visible gap (if any), affected window, data exposed, root cause, and the follow-up control change. This becomes an addition to `docs/security/threat-model.md` if it reveals a gap that table doesn't cover.

## Per-threat pointers

The primary mitigation and detection/recovery signal for each threat category already lives in `docs/security/threat-model.md`; this file is the procedure once that signal fires. In particular:

- **GitHub account or token compromise**: force-rotate the credential, review recent audit-log actions by that identity, and redeploy from the last SHA known to predate the compromise window. A signed-commit history does not distinguish the attacker's actions from the legitimate user's - a stolen session can still produce GitHub-verified commits - so treat every action by the affected identity during the suspected window as untrusted until the audit log and out-of-band contact with the account owner say otherwise (see `docs/security/secrets-and-access.md`, "Account-compromise controls").
- **Malicious PR or dependency merged**: revert the merge commit, redeploy the prior artifact, and re-run the supply-chain scanner before re-attempting the change through normal review.
- **Forged or replayed webhook that was actually processed** (a bug bypassed HMAC/idempotency checks rather than the attacker guessing the secret): disable the webhook route immediately, audit which events were applied, and reconcile subscriber state from the provider rather than trusting the local projection.
- **Accidental publication of draft or restricted content**: unpublish by redeploying the prior artifact (never a silent file delete against the live site), and treat the exposure window as public regardless of how quickly it was reverted - caches and crawlers may have already captured it.
- **Secret committed to the repository**: rotate the secret immediately regardless of whether the branch was ever merged or public; a force-push or history rewrite does not un-expose a secret that was ever pushed.

## Escalation and communication

At current team size (single maintainer/small team), "escalation" means the incident is recorded and, for SEV1/SEV2, the affected external party is notified: the newsletter provider (if subscriber data may be affected) or readers (if incorrect published content requires a correction notice per `docs/editorial/workflow.md`). Define a named on-call/owner and a second contact before any production account is activated - this is a launch blocker, not a Phase 1 deliverable, and is tracked in `docs/research/architecture-research-report.md` under launch blockers.
