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

Gate: preview inspected at mobile and desktop sizes; quality gates green. That's satisfied. What's still open before Phase 2 can be called fully closed: the real GitHub Actions approval/deployment workflow exists (`.github/workflows/`) but has never run against a live repository - there is no GitHub remote for this project yet, so it's correct by careful reading of GitHub's API, not exercised. Creating that remote, configuring branch protection and required reviewers, replacing `.github/CODEOWNERS`'s placeholder username, and a real trial run are launch-blocker items, tracked in `docs/research/architecture-research-report.md`. OG-image generation at scale (~216ms/image, several minutes at 1,000+ articles) is a known, tracked, unfixed scaling risk that should be addressed (caching or parallelization) before the real archive grows that large - see `docs/poc/README.md`.

## Phase 3 - editorial and advanced features

- Add a database-backed editorial queue and source/claim review metadata only if the Git-only workflow becomes a measured bottleneck.
- Add preview tokens, scheduled build orchestration, revision history UI, SEO preview, duplicate-topic detection, and internal-link suggestions.
- Add interactive failure timelines, trace views, simulations, and paper-to-practice mappings only when each improves comprehension.
- Add Buttondown integration after consent/DNS/suppression verification.
- Add privacy-safe analytics, OTel instrumentation, and optional Langfuse correlation for AI editorial assistance.

Gate: no autonomous publishing; human approval remains mandatory.

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
