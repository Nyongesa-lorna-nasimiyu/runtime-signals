# Local non-production proofs of concept

Date: 2026-08-28. Updated 2026-08-29: the Astro workspace now exists (Phase 2
checkpoints 1-2) and all four POCs originally deferred below are complete —
see "POCs completed once the Astro workspace existed." This file was left
claiming "the repository is currently documentation-only" for a full
checkpoint after that stopped being true; caught by external review, not
by re-reading this file after each checkpoint, which is now the standing
practice.

These POCs still deliberately use no external accounts, APIs, secrets, or real subscriber data.

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

## POCs completed once the Astro workspace existed

All four originally deferred here are done, against the real thing, not a simulation:

- **Content Collection schema validation**: `src/content.config.ts`'s zod schema is live; `tests/unit/claims.test.ts` proves the "supported/mixed claim needs a source" rule in isolation, and a real invalid fixture was committed, built with `astro check` (rejected with the exact expected error), then removed - a manual verification, documented in the Phase 2 checkpoint report rather than kept as a standing test, since `astro:content` inside plain `vitest run` is a documented-flaky combination (see `tests/integration/README.md`).
- **Draft/future/unapproved-content exclusion**: `scripts/verify-draft-exclusion.mjs` is a real black-box check against `dist/` after a real `astro build` - not a mock. It's proven to actually catch a regression, not just pass: the sitemap-exclusion bug an external review found was confirmed to make this script fail before the fix, and pass after.
- **Real Pagefind index generation and size**: `scripts/measure-pagefind-index.mjs` measures the actual `dist/pagefind/` output post-build. Current fixture volume (2 articles, 1 brief): content data (`pf_fragment`+`pf_index`+`pf_meta`) is ~21 KB gzip; total including the search engine runtime itself is ~281 KB gzip. Still needs re-measuring at realistic archive size - see "Remaining: fixture scaling" below.
- **Analytics-script performance impact**: `scripts/measure-analytics-script.mjs` fetches Cloudflare Web Analytics' real, public `beacon.min.js` (no account created, no data sent) - 9.5 KB gzip as served, not the ~5 KB budget assumed when ADR-0003 was written.

## Remaining: fixture scaling

Not yet done: re-running `measure-pagefind-index.mjs` and a full `astro build` timing measurement against synthetic archives of 100, 1,000, and 5,000 documents, which is what ADR-0001's migration boundary (1-2 MB compressed search payload) is actually measured against. Tracked as an open Checkpoint 2 item, not silently dropped.

Record Node version, output, and fixture commit in the eventual implementation report.
