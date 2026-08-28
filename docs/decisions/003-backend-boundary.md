# ADR 003: No Express, and no Convex, in the initial release

Status: proposed

Date: 2026-08-28 (revised 2026-08-28 to remove a stale Convex recommendation; see note)

## Decision

Do not add Express or Convex to the first release. Use Astro build hooks and GitHub Actions for content builds, a narrowly scoped Cloudflare Worker route only when a documented dynamic requirement appears (for example a newsletter form or verified webhook), and the newsletter provider's API for delivery. No backend service is required to serve, search, or subscribe to Runtime Signals at launch.

## Rationale

Express and Convex would each add a deployable service, secret boundary, runtime, and observability surface without a current requirement. The publication is static-first: reading, search (Pagefind), and the newsletter (provider-authoritative, per ADR-0002) all work without an application server or database. If a bounded dynamic need emerges that a static build and a Worker route cannot own — for example a local subscriber projection, an audit ledger, or a reconciliation queue — evaluate it against Cloudflare D1 first, not Convex, because D1's SQL export and Worker-native integration are simpler to keep portable. See ADR-0002 for the concrete comparison. Add Express only if a bounded need requires a long-running process or a runtime Workers cannot support.

## Note

An earlier draft of this ADR recommended Convex for "narrow dynamic webhooks/forms." That recommendation predated, and was superseded by, the architecture direction finalized in `docs/architecture/overview.md`, `docs/research/phase-1-decision-pack.md`, and ADR-0001 through ADR-0004, all of which state no Convex or Express is required at launch. This revision reconciles the two; no other document in this pack recommends Convex.

