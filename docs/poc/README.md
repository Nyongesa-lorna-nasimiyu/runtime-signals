# Local non-production proofs of concept

Date: 2026-08-28

The repository is currently documentation-only, so these POCs deliberately use no external accounts, APIs, secrets, or real subscriber data.

## Run

Requires Node.js 20+ for the built-in `node:test` runner:

```text
node docs/poc/search-size/measure.mjs
node --test docs/poc/newsletter-contracts/provider.test.mjs docs/poc/publication-gate/validate.test.mjs docs/poc/scheduled-publish/idempotency.test.mjs
```

## POCs delivered in Phase 1

- `search-size/measure.mjs`: generates deterministic synthetic article records at 100/1,000/5,000 documents and reports raw/gzip JSON sizes. It is a payload-bound estimate, not a Pagefind benchmark.
- `newsletter-contracts/provider.test.mjs`: tests pending/confirmed/duplicate states, idempotency, webhook ordering, signature rejection, and replay.
- `publication-gate/validate.test.mjs`: tests that content validation (schema shape, timing) and authorization (a CI-generated approval manifest keyed by commit SHA, required checks, CODEOWNERS, deployment-environment authorization) are independent checks - a forged frontmatter approval field has no effect, and approval tied to an old commit SHA is rejected once content changes.
- `scheduled-publish/idempotency.test.mjs`: proves the scheduled-build snapshot in `docs/architecture/data-flows.md` ("Scheduled publication") is a pure, order-independent function of `(records, approvalManifest, now)`. Rerunning it later with no change yields an identical artifact hash (safe no-op redeploy); a future-dated record is picked up automatically once its time passes; and - the case the first version of this POC missed - editing a record's body/title/sources without changing `canonical` or `published_at` changes the hash via `content_digest`, so a silent content edit cannot be mistaken for a no-op and skipped.

## POCs explicitly deferred to Phase 2

The original research brief also asked for proofs on Astro Content Collection schema validation, draft-content exclusion from the real search index, real Pagefind index generation, and analytics-script performance impact. These four are deferred, not silently dropped, because the repository has no Astro workspace, Content Collections schema, or chosen analytics script yet - there is nothing real to measure. Each is picked up in Phase 2 once the corresponding scaffold exists:

- Content Collection validation and draft exclusion: as soon as `src/content/config.ts` exists (Phase 2, "typed content collections").
- Real Pagefind index generation and size: as soon as the Astro build produces real HTML (Phase 2 gate).
- Analytics script performance impact: once ADR-0003 is approved and Cloudflare Web Analytics' actual beacon script is added.

Record Node version, output, and fixture commit in the eventual implementation report.
