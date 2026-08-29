# Implementation roadmap and gates

## Phase 1 - research and decisions

Deliverables complete in this repository:

- Product thesis and decision pack.
- Competitive analysis.
- Brand/domain shortlist.
- Stack and architecture decisions.
- Content model.
- SEO and AI-search strategy.
- Editorial strategy and article briefs.
- Cost, security, and observability direction.

Gate: user approval of masthead/domain pursuit, architecture, hosting, and newsletter evaluation.

**Resolved 2026-08-28**: architecture, hosting, search (ADR-0001), analytics (ADR-0003), and editorial automation (ADR-0004) are accepted. Newsletter architecture (ADR-0002) is accepted; Buttondown as the specific provider remains conditional pending account-level verification. Brand/domain confirmation remains open. See `docs/research/phase-1-decision-pack.md` for the resolved/open split. Phase 2 may begin.

## Phase 2 - product foundation

- Create the TypeScript/Astro workspace and pinned toolchain. **Done** (checkpoint 1).
- Build design tokens, typography, responsive layout, theme, landmarks, and article chrome. **Done** (checkpoint 1; hardened with cascade layers, `light-dark()`, touch targets in checkpoint 2).
- Add typed content collections, Markdown renderer, source records, claim validation, slug collision checks, and redirects. **Done** (checkpoint 1) - redirects specifically not yet exercised (no content has moved URLs yet to test against).
- Add routes for home, articles, topics, series, authors, sources, about, methodology, policy, and 404. **Done** (checkpoint 1).
- Generate metadata, JSON-LD, sitemap, robots, RSS, Atom, OG images, and print styles. **Done** - OG images and print styles landed in checkpoint 2; everything else in checkpoint 1.
- Add search index foundation; keep initial search client-side/static if content volume is small. **Done**: Pagefind, lazy-loaded on `/search` only, `client:idle`. Filter metadata (topic/author/series/date) is indexed but has no UI controls yet - explicitly deferred, not silently dropped; see `docs/poc/README.md`.
- Add tests for rendering, metadata, feeds, structured data, links, accessibility, and mobile layouts. **Done**: unit (33), a11y (axe), CSP, print, and draft-exclusion black-box tests all real and passing, plus visual regression (18 baselines across 6 routes x 3 viewport/color-scheme combinations, `tests/visual/`) and fixture-scale testing (100/1k/5k documents, real numbers in `docs/poc/README.md`) - both completed in checkpoint 2.

Gate: preview inspected at mobile and desktop sizes; quality gates green. **Fully satisfied as of 2026-08-29**: the repository is live at `github.com/Nyongesa-lorna-nasimiyu/runtime-signals`, with branch protection (required PR, `publication-gate` check, CODEOWNERS review, no bypass), a real `.github/CODEOWNERS`, and the `production` environment's required-reviewer approval all configured and exercised for real across multiple merged PRs - not just configured and left untested. Two real bugs were found and fixed only by running the actual workflow: the approval-manifest generator checked the wrong commit's check-runs (the merge commit, which never itself ran CI, instead of the PR head commit that did), and `verify-security-headers.mjs` hung for 8+ minutes in CI from an unkilled `wrangler dev` process tree (fixed by killing the whole process group). OG-image generation at scale (~216ms/image, several minutes at 1,000+ articles) remains a known, tracked, unfixed scaling risk - see `docs/poc/README.md`.

## Phase 3 - editorial and advanced features

### Checkpoint 1: safe editorial operations - complete (2026-08-29)

- **Scheduled publishing**: hourly cron (`.github/workflows/scheduled-publish.yml`) dispatches a real `deploy.yml` run once `status: scheduled` content's `published_at` passes, reusing every existing approval/build/verification/environment-reviewer gate rather than duplicating any of them. Watermark is the workflow's own last successful run, so a missed run is self-healing. See `docs/editorial/scheduled-publishing.md`.
- **Preview safety**: `pr-preview.yml` builds every PR with a forced site-wide noindex (meta tag and `robots.txt`), validates metadata, runs the existing a11y suite, and runs a real Lighthouse performance audit. No live preview URL yet - that needs a real Cloudflare account/token, the same constraint real (non-dry-run) deployment has always had; the artifact-based build today is designed so a live URL is additive later, not a redesign. See `docs/editorial/pr-previews.md`.
- **PR editorial quality report**: an advisory-only comment on every content PR - SEO preview, possible-duplicate-coverage detection, internal-link suggestions, citation/source coverage - that never blocks a merge. Proven against this repo's own content: caught a genuine unlinked internal-link mention on its first real run. See `docs/editorial/pr-editorial-report.md`.
- Revision history UI (landed in Phase 2 checkpoint 2, ahead of this checkpoint) already covers what this list originally called "revision history UI."

Not yet done, deferred to a later checkpoint: preview tokens (authenticated single-draft preview at request time - distinct from the PR-preview builds above), a database-backed editorial queue (only if Git-only workflow friction is actually measured), duplicate-detection at the *topics collection* level specifically (three topics today doesn't need it - see the interpretation note in `docs/editorial/pr-editorial-report.md`), interactive failure timelines/trace views/simulations, Buttondown integration, and privacy-safe analytics/OTel instrumentation.

Gate: no autonomous publishing; human approval remains mandatory. Satisfied throughout checkpoint 1: scheduled publishing only ever rebuilds a commit that already went through a reviewed, checked PR merge - it never merges anything itself.

## Phase 4 - content and SEO launch

- Write five pillar pages.
- Publish three complete launch articles plus the ten-brief backlog.
- Prepare 30-day calendar, redirects, author pages, methodology, and corrections policy.
- Register Search Console and Bing Webmaster, submit sitemap, evaluate IndexNow for publication events.
- Run Lighthouse, schema validation, link checks, accessibility audit, and visual QA.

Gate: launch checklist approved; email remains disabled until deliverability checks pass.

## Phase 5 - production readiness

- Dependency and supply-chain audit.
- Threat-model review and preview/authentication test.
- Backup/restore and export rehearsal.
- Build reproducibility check.
- Observability and alert verification.
- Deployment rollback and content correction rehearsal.
- Domain cutover and canonical verification only after explicit approval.
