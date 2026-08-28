# ADR 004: Managed newsletter first

Status: proposed

Date: 2026-08-28

## Decision

Evaluate Buttondown first for the launch newsletter. Do not maintain a local subscriber database initially; keep only a provider-neutral export and reconciliation procedure. Add a minimal event projection only if a concrete consent-audit or migration requirement appears.

## Alternatives

- **Buttondown**: low cost at small scale, Markdown-native, API, exports, webhooks, privacy positioning. Best launch fit.
- **Resend + custom system**: strong developer APIs and delivery events; requires building list management, preference center, campaign workflow, consent and suppression logic, and more compliance surface.
- **beehiiv**: strong growth and newsletter monetization features; Launch is free up to 2,500 subscribers but advanced automation/webhooks are on paid Scale, currently listed at $43/month. Better after growth features are proven necessary.
- **Kit**: strong creator automation/commerce, but Creator starts at $39/month for up to 1,000 subscribers and is broader than the initial need.

## Required pre-send gate

Verify sender domain SPF/DKIM/DMARC, confirmed opt-in, unsubscribe and suppression behavior, export, webhook HMAC/signature verification, retention, privacy terms, and a test delivery to representative inboxes. No production send before this gate passes.
