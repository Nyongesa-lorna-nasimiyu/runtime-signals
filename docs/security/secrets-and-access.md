# Secrets and access

Date: 2026-08-28

## Required controls

- Require phishing-resistant MFA where available for GitHub, registrar, Cloudflare, and newsletter accounts.
- Protect the default branch; require CODEOWNERS review and successful `publication-gate` checks.
- Use separate preview and production environments. Never expose production secrets to forked or untrusted pull requests.
- Use narrowly scoped GitHub tokens. The content-validation job needs no deployment or provider secret.
- Store provider/API/webhook secrets only in protected environments. Do not put them in Astro public variables or generated assets.
- Pin third-party Actions to full commit SHAs; review dependency updates and run a supply-chain scanner such as OpenSSF Scorecard as an advisory check.
- Enable Dependabot version and security updates on the repository (GitHub-native, no added service) so dependency bumps arrive as reviewable, individually mergeable PRs rather than manual, irregular updates; require the same CI checks on those PRs as any other.
- Require signed commits (GPG, SSH, or GitHub's Sigstore-backed web commit signing) on the default branch for maintainers with merge rights. Treat this as a provenance and tamper-evidence control only: a valid signature proves which key or platform-authenticated session produced the commit, not that the human behind it was uncompromised — a stolen GitHub session can still produce a GitHub-verified web commit, and a stolen local key can still sign. Signed commits are worth requiring for supply-chain provenance (surviving a repository copy or history tampering outside GitHub) but they are not an account-compromise control; do not rely on them to detect or contain one. Do not require signing from external contributors, who go through PR review regardless.
- Rotate deployment and provider credentials at least annually and immediately after suspected exposure; record owner, last rotation, scope, and next review.
- Require two-person review for canonical URL changes, public deletion, security-sensitive content, newsletter sends, and export of subscriber data.
- See `docs/security/incident-response.md` for the procedure once a control above fails or a compromise is suspected.

## Account-compromise controls

These, not signed commits, are what actually detects and contains a compromised GitHub account or stolen session — signed commits only prove provenance, per the note above.

- **Phishing-resistant MFA** (hardware security key or platform passkey, not SMS/TOTP alone) on every account with merge or deployment authority.
- **Protected deployment environments with required reviewers**, separate from branch protection, so a single compromised merge-capable account still cannot deploy without an independent approval.
- **Independent reviewers via CODEOWNERS**, so one compromised account cannot both author and approve a change.
- **Short-lived deployment credentials**: prefer OIDC-based, per-run tokens (e.g., GitHub's OIDC federation to Cloudflare) over long-lived static deployment secrets wherever the provider supports it, so a leaked credential expires on its own rather than requiring detection before it can be misused.
- **Audit-log retention and review**: keep GitHub organization/repository audit logs and Cloudflare account audit logs enabled and reviewed after any suspected incident, not only reactively — this is the actual way to distinguish a legitimate action from a stolen-session action, which a commit signature cannot do.
- **Out-of-band account recovery**: for each critical account (GitHub, registrar, Cloudflare, newsletter provider), maintain a tested recovery path independent of the primary email/device — offline recovery codes or a verified secondary contact — so a compromise of the primary channel doesn't also block recovery.

## Public response headers

Plan a restrictive Content-Security-Policy after inventorying Astro, search, analytics, and any embeds. Add HSTS after HTTPS is verified, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` with unused capabilities disabled, and frame protections. Use Subresource Integrity or self-host assets where practical. Do not allow inline executable MDX.

## Preview policy

Preview deployments are noindex, unlinked, unguessable, time-limited where the platform supports it, and contain no subscriber or production data. Draft content must never be included in the public production search index or sitemap.
