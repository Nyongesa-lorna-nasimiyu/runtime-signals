# ADR-0002: Buttondown candidate with provider-authoritative subscribers

- Status: Conditional - the provider-authoritative, no-local-DB, no-webhooks-at-launch architecture is accepted; Buttondown specifically remains a candidate pending account-level verification
- Date: 2026-08-28 (conditional acceptance 2026-08-28)
- Approval state: Architecture accepted. Buttondown is not locked until the account-level checks in "Testing and launch checklist" are verified (current pricing/quotas/DPA at signup, exact 1k/10k subscriber cost, DNS authentication, consent/suppression behavior). If those checks fail, the architecture stands and Resend/Kit/MailerLite become the fallback candidate without changing this ADR's decision. No account, DNS, integration, or email sending authorized yet.

## Context

The publication needs confirmed subscriptions, suppression and unsubscribe handling, delivery events, export, and low operational burden. Public pages must remain readable if email is unavailable. The website should not collect more personal data than needed.

## Requirements

Lifecycle: anonymous → pending confirmation → confirmed/active → unsubscribed, suppressed, bounced, or complained. Duplicate requests must be safe; responses must not reveal whether an address exists. Provider webhooks must be authenticated, replay-safe, and idempotent. Export and deletion must be possible. Production email is prohibited until DNS authentication, consent, and suppression tests pass.

## Options considered

| Option | Fit now | Main tradeoff |
| --- | --- | --- |
| Buttondown + provider form/API | Recommended candidate | Strong double opt-in and simple API; pricing/add-ons and API quotas need final account-level verification |
| Resend + custom store | Deferred alternative | Better application control and delivery events; requires building consent, list, unsubscribe, segmentation, and export behavior |
| Kit | Deferred | Mature creator automation and signed webhooks; higher plan cost at the current snapshot |
| Beehiiv | Deferred | Strong newsletter growth features and free Launch tier; less aligned with a small developer-owned content system and Send API requires higher plan |
| MailerLite | Deferred | Low-cost forms/automation and free 250-subscriber tier; usage pricing and broader marketing surface add migration/complexity concerns |
| Ghost | Rejected for launch | Newsletter and members are capable, but it would replace the approved Astro/Git source architecture |

## Decision

Select Buttondown as the first candidate to validate, not as an accepted production dependency. Use its double-opt-in subscriber lifecycle. Do not maintain a local subscriber database at launch. The provider is authoritative; the site stores no email address after forwarding a valid signup. If a Worker form route is added, it returns a generic response, uses a provider adapter, and sends no email itself.

**Do not accept provider webhooks at launch.** With no durable store and no local subscriber projection, a webhook receiver has nothing correctness-critical to update - Buttondown's own dashboard and lifecycle already reflect confirmation, unsubscribe, bounce, and complaint state, and a scheduled export/reconciliation (already required by this ADR's exit strategy) covers any operational need to see that state locally. Standing up a webhook endpoint before there is a durable, idempotent store to write into adds an unauthenticated-until-proven-otherwise public endpoint, a signature-verification and replay-defense surface, and an idempotency-key store - real engineering cost for no launch-time benefit. Reconsider only when a concrete requirement needs near-real-time reaction to a subscriber event (for example, gating access to something on confirmation status) that polling or scheduled export cannot satisfy; at that point, `docs/poc/newsletter-contracts/provider.test.mjs` already validates the signature/idempotency/replay contract the endpoint would need.

Use a dedicated sending subdomain such as `mail.runtimesignals.tech` (exact label to be chosen before DNS work), with a root-domain reply-to address. This isolates newsletter reputation from the website. Configure SPF, DKIM, DMARC, Return-Path, and any tracking-domain records only after approval.

Maintain a provider-neutral export/reconciliation procedure, not a live local projection. Add D1 only if evidence shows a need for local consent audit history, multi-provider migration, multiple newsletters, or an application-owned preference center. D1 is preferred over Convex for this narrow future role because SQL export and portability are straightforward; it still creates personal-data and backup obligations.

## Evidence

- Buttondown documents default double opt-in and an `unactivated` state: [double opt-in](https://docs.buttondown.com/double-opt-in), [create subscriber](https://docs.buttondown.com/api-subscribers-create), accessed 2026-08-28.
- Buttondown documents subscriber APIs, exports, and HMAC-SHA256 signed webhook events: [API](https://docs.buttondown.com/api-introduction), [exports](https://docs.buttondown.com/api-exports-introduction), [webhooks](https://docs.buttondown.com/api-webhooks-introduction), accessed 2026-08-28.
- Buttondown's current pricing page shows no charge for the first 100 subscribers and add-ons for capabilities including analytics, segmentation, RSS-to-email, and automations; exact list pricing must be confirmed at checkout: [pricing](https://buttondown.com/pricing), accessed 2026-08-28.
- Resend documents contact management, delivery events, suppressions, and one-click unsubscribe: [pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing), [events](https://resend.com/docs/webhooks/event-types), [suppressions](https://resend.com/docs/dashboard/emails/email-suppressions), [unsubscribe](https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails), accessed 2026-08-28.
- Ghost documents built-in newsletters, custom sending domains on paid plans, and member CSV export: [pricing](https://ghost.org/pricing), [newsletters](https://docs.ghost.org/newsletters), [exports](https://ghost.org/help/exports/), accessed 2026-08-28.

The preference for Buttondown is inference from the publication's low-volume, consent-sensitive, Git-backed shape; it is not a claim that Buttondown is universally superior.

## Data flow and boundaries

Provider states are authoritative. A future local audit record may contain provider event ID, event type, received timestamp, signature result, and a one-way address fingerprint; it must not store raw addresses unless a documented requirement appears. Do not send article drafts, source contents, or arbitrary metadata to the provider.

## Consequences

Positive: no database, no local PII, less deliverability code, portable static site, strong default consent.

Negative: provider outage or API quota can block new signup but not reading; provider data model and pricing constrain future segmentation; a local audit trail is limited.

## Risks

- Subscription bombing: generic responses, IP/email rate limits, Turnstile only if abuse warrants it, provider double opt-in.
- Forged/replayed webhooks: not applicable at launch - no webhook endpoint exists to attack (see Decision). If one is added later: raw-body HMAC verification, timestamp/event-ID dedupe, short timeout, no side effects before validation.
- Suppression divergence: provider remains authoritative; scheduled export/reconciliation before campaigns.
- API-key leakage: secret only in protected environment, least scope, rotation runbook, never client-side.
- Enumeration: identical response and timing envelope for duplicate/new requests.
- Accidental sends: two-person review for campaigns; no automation sends during launch.

## Mitigations

The launch mitigation is to keep the provider out of the public critical path until its consent, DNS, export, suppression, webhook, and outage tests pass. The form adapter must be idempotent and generic; the provider remains the source of truth.

## Cost

Buttondown's first 100 subscribers are currently shown as free; add-ons are shown at $9/month each for several features and $29/month for broader custom-domain/archive/automation capabilities. Exact 1k/10k subscriber cost is not published as a stable static figure in the research snapshot and must be verified in the account/checkout before purchase. Resend's official pricing documents $0 up to 1,000 marketing contacts and $40/month up to 5,000 contacts, with separate sending limits; it is a comparison, not the decision.

## Exit strategy

Export the subscriber list and suppression state on a scheduled, access-controlled cadence. Maintain provider-neutral states and consent timestamps in the export manifest. A Resend, Kit, MailerLite, or self-managed provider adapter can import the CSV after revalidating consent and suppression. Never migrate by copying only active addresses.

## Reconsideration triggers

More than one newsletter, provider cost above the approved budget, need for application-owned preferences, need for transactional mail, recurring API quota failures, unacceptable deliverability, data residency requirements, or a requirement to preserve a local immutable consent ledger.

## Testing and launch checklist

Launch-blocking (no webhook endpoint involved):

- Mock pending/confirmed/duplicate/unsubscribed/bounced/complained states.
- Verify SPF/DKIM/DMARC and Return-Path in a test domain before production.
- Verify confirmation, unsubscribe, suppression, export, deletion, and complaint handling with test addresses via the dashboard/export, not a webhook.
- Confirm DPA, subprocessors, retention, support, rate limits, pricing, and export format in the selected account.

Deferred until a webhook endpoint is actually built (not launch-blocking, per the no-webhooks-at-launch decision above):

- Verify generic responses, idempotency, signature failure, replay, out-of-order events, retry, and provider outage - already covered as a contract test in `docs/poc/newsletter-contracts/provider.test.mjs`, to be re-run against the real endpoint before it goes live.
