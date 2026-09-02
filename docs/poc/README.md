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
- **Real Pagefind index generation and size**: `scripts/measure-pagefind-index.mjs` measures the actual `dist/pagefind/` output post-build. At the initial fixture volume (2 articles, 1 brief), content data (`pf_fragment`+`pf_index`+`pf_meta`) is ~21 KB gzip; total including the search engine runtime itself is ~281 KB gzip. Scaling at 100/1,000/5,000 documents is now measured below; re-measure again once the real archive reaches the low thousands rather than assuming these numbers hold indefinitely.
- **Analytics-script performance impact**: `scripts/measure-analytics-script.mjs` fetches Cloudflare Web Analytics' real, public `beacon.min.js` (no account created, no data sent) - 9.5 KB gzip as served, not the ~5 KB budget assumed when ADR-0003 was written.

## Fixture scaling: complete (2026-08-29)

`scripts/measure-build-at-scale.mjs` generates real, schema-valid synthetic articles (~550 words each, matching the real article's length) directly into `src/content/articles/`, runs the real `astro build` + `pagefind` pipeline, measures, and always removes them again (a `finally` block, safe even on failure — verified by actually killing the process mid-run once and confirming cleanup left no synthetic fixtures behind).

**Content build + Pagefind (Node v24.15.0):**

| Documents | Build time | Pagefind time | Pagefind raw | Pagefind gzip (whole archive) |
| --- | --- | --- | --- | --- |
| 100 | 15.8s | 0.58s | 762 KB | — |
| 1,000 | 101.7s | 0.97s | 1.53 MB | — |
| 5,000 | 559.0s (9.3 min) | 3.14s | 4.87 MB | 4.56 MB |

Pagefind itself scales well below linearly (0.58s → 3.14s for a 50x document increase). Build time scales sub-linearly too (100→1,000 is 10x documents for 6.4x time; 1,000→5,000 is 5x documents for 5.5x time) — no red flag there.

**Reading the 4.56 MB gzip figure against ADR-0001's "1-2 MB compressed search payload" migration boundary requires care — it is not a like-for-like comparison on its own.** That figure is the *entire archive's* Pagefind footprint (all 5,024 per-document fragment files, summed). A real search session doesn't download that — Pagefind lazy-loads only the fragments matching a query. The relevant figure for "what does opening search actually cost" is the fixed engine + index-metadata payload every session pays regardless of archive size: JS runtime (108 KB gzip) + WASM engine (140 KB gzip) + `pf_meta` (27.5 KB gzip) + `pf_index` (114.8 KB gzip at 5,000 docs) ≈ **382 KB gzip** — comfortably under the boundary. Per-query cost beyond that is small: the average fragment is ~865 bytes gzip, so even a query matching 50 documents adds only ~43 KB.

**What this does support watching**: `pf_index` itself (the term→document mapping) grows with corpus size, not just fragment count, and CDN/storage cost for the full archive (4.56 MB at 5,000 docs) is a real, separate consideration from search-session payload. Neither is a launch blocker at realistic near-term archive sizes (tens to low hundreds of articles), but both are worth re-measuring again once the real archive reaches the low thousands, not assumed to still be fine.

**A real, separate finding this surfaced**: an un-isolated first run (measuring OG-image generation and Pagefind/build together) took 578s to build just 1,000 documents — 10x the isolated content-build time. Direct benchmarking (`renderOgImage()` called 20 times, no Astro build overhead) found the real cause: Satori font-shaping + resvg PNG encoding costs **~216ms per image**, sequential in Astro's static path generation. At 1,000 real articles that's ~3.6 minutes added to every single build; at 5,000 it's ~18 minutes. `src/lib/og-image.ts`'s `SKIP_OG_RENDER` env var (used only by this measurement script) isolates the two costs for measurement, but doesn't fix the underlying scaling problem. **Tracked as an open item, not silently accepted or silently fixed**: before the real archive reaches the low hundreds of articles, OG generation needs either build-to-build caching (skip re-rendering an image whose content-version hasn't changed — the images are already version-stamped via `?v={revision date}`, so the infrastructure for this exists) or parallelization.

Record Node version, output, and fixture commit in the eventual implementation report.
