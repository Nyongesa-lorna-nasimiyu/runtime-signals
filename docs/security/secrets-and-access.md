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
- Require signed commits (GPG, SSH, or GitHub's Sigstore-backed web commit signing) on the default branch for maintainers with merge rights. Treat this as a provenance and tamper-evidence control only: a valid signature proves which key or platform-authenticated session produced the commit, not that the human behind it was uncompromised - a stolen GitHub session can still produce a GitHub-verified web commit, and a stolen local key can still sign. Signed commits are worth requiring for supply-chain provenance (surviving a repository copy or history tampering outside GitHub) but they are not an account-compromise control; do not rely on them to detect or contain one. Do not require signing from external contributors, who go through PR review regardless.
- Rotate deployment and provider credentials at least annually and immediately after suspected exposure; record owner, last rotation, scope, and next review.
- Require two-person review for canonical URL changes, public deletion, security-sensitive content, newsletter sends, and export of subscriber data.
- See `docs/security/incident-response.md` for the procedure once a control above fails or a compromise is suspected.

## Cloudflare deployment

`.github/workflows/deploy.yml` runs only after the protected `production`
environment's approval and reads `CLOUDFLARE_API_TOKEN` from that environment's
secrets. The non-secret `CLOUDFLARE_ACCOUNT_ID` is read from the same
environment's variables. Production credentials are not passed to pull-request
or preview workflows.

## Rotation record

The previously exposed Cloudflare API token was rolled by the account owner on
2026-09-01. The token value is intentionally not recorded here. Keep the exact
scope, owner, and next rotation date in the private credential inventory, and
review the Cloudflare audit log after a rotation or suspected exposure.

## Account-compromise controls

These, not signed commits, are what actually detects and contains a compromised GitHub account or stolen session - signed commits only prove provenance, per the note above.

- **Phishing-resistant MFA** (hardware security key or platform passkey, not SMS/TOTP alone) on every account with merge or deployment authority.
- **Protected deployment environments with required reviewers**, separate from branch protection, so a single compromised merge-capable account still cannot deploy without an independent approval.
- **Independent reviewers via CODEOWNERS**, so one compromised account cannot both author and approve a change.
- **Short-lived deployment credentials**: prefer OIDC-based, per-run tokens (e.g., GitHub's OIDC federation to Cloudflare) over long-lived static deployment secrets wherever the provider supports it, so a leaked credential expires on its own rather than requiring detection before it can be misused.
- **Audit-log retention and review**: keep GitHub organization/repository audit logs and Cloudflare account audit logs enabled and reviewed after any suspected incident, not only reactively - this is the actual way to distinguish a legitimate action from a stolen-session action, which a commit signature cannot do.
- **Out-of-band account recovery**: for each critical account (GitHub, registrar, Cloudflare, newsletter provider), maintain a tested recovery path independent of the primary email/device - offline recovery codes or a verified secondary contact - so a compromise of the primary channel doesn't also block recovery.

## Public response headers

Implemented, not just planned, as of Phase 2 Checkpoint 2 — `public/_headers` (Cloudflare Workers Static Assets custom-headers convention) ships on every response, verified against a real `wrangler dev` round trip by `scripts/verify-security-headers.mjs`:

- `Content-Security-Policy: frame-ancestors 'self'` — the one directive Astro's per-page `<meta>`-delivered CSP (`astro.config.mjs`, `security.csp`) cannot enforce, since browsers ignore `frame-ancestors` in a `<meta>` tag. The primary CSP (hash-based `script-src`/`style-src`, no `unsafe-eval`, no `unsafe-inline`) stays meta-delivered per page; this header adds clickjacking protection without duplicating or conflicting with it.
- `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), geolocation=(), microphone=(), interest-cohort=()`, `Cross-Origin-Opener-Policy: same-origin-allow-popups`.
- `Strict-Transport-Security` at a deliberately short `max-age=300` bootstrap value — see `public/_headers`'s own comment and launch blocker #10 in `docs/research/architecture-research-report.md` for why the eventual one-year value is a launch-time step, not something to ship before HTTPS/DNS stability is verified.

Deliberately not implemented, and why: Trusted Types enforcement (would need React's `dangerouslySetInnerHTML` sink in `SearchIsland.tsx` routed through a Trusted Types policy for a single sink that only ever receives Pagefind's own excerpt HTML over already-reviewed content, never a raw query — disproportionate for one bounded sink); COEP/cross-origin isolation (no `SharedArrayBuffer`/WASM-threading use case); Fetch Metadata resource isolation and CORS header tuning (no server-side app, no cross-site API surface to protect). Revisit each if the architecture changes. Use Subresource Integrity for any future third-party script, and self-host where practical (already the policy for fonts and the Pagefind runtime). Do not allow inline executable MDX.

## Preview policy

Preview deployments are noindex, unlinked, unguessable, time-limited where the platform supports it, and contain no subscriber or production data. Draft content must never be included in the public production search index or sitemap.
