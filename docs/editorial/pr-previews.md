# PR previews

Date: 2026-08-29

How a reviewer sees a rendered PR before merging, and what's deliberately not built yet.

## What runs

`.github/workflows/pr-preview.yml` runs on every pull request:

1. Builds the site at the PR's head commit with `PREVIEW_BUILD=true`.
2. Verifies metadata across every page (`scripts/verify-preview-metadata.mjs`): title, description, canonical URL, Open Graph tags, and JSON-LD are all present and non-empty.
3. Runs the existing accessibility suite (`npm run test:a11y`, axe-core) against the build.
4. Runs a real Lighthouse performance audit (`scripts/verify-preview-performance.mjs`) against two representative routes - the homepage and one article - requiring a performance score of at least 0.85 and, since Phase 3 Checkpoint 2, explicit Core Web Vitals budgets (see below).
5. Uploads the built `dist/` and the performance audit JSON as short-lived (7-day) GitHub Actions artifacts.

This is separate from `publication-gate.yml`, which already runs `npm run build` on every PR but only to prove the build succeeds - it never inspects or exposes the output itself. `pr-preview.yml` is what lets a reviewer actually look at the rendered result.

## Why an artifact, not a live URL

"Uncacheable or isolated preview URLs" was part of the original brief for this checkpoint. A live per-PR preview URL (e.g. Cloudflare Pages preview deployments, which support exactly this) needs a real Cloudflare account and API token - and none has been configured for this project at any point, the same constraint `deploy.yml`'s dry-run-only deploy step already documents honestly (see `docs/research/architecture-research-report.md`).

Rather than fake a preview URL or silently skip this requirement, the workflow is built so a live URL is an additive change later, not a redesign: everything except the final "upload as artifact" vs. "deploy to a URL" step is already exactly what a real preview deployment needs (an isolated build, forced noindex, no secrets). A reviewer today downloads the `preview-pr-<number>` artifact and serves it locally (`npx serve dist -p 4321`, or opens `index.html` directly for pages with no client-side routing needs).

## Isolation and noindex

- `src/layouts/BaseLayout.astro` forces a site-wide `<meta name="robots" content="noindex, nofollow">` when `PREVIEW_BUILD=true`, regardless of what any individual page's own `noindex` setting is - a PR's content hasn't gone through review yet, so nothing in a preview build should ever be indexable.
- `src/pages/robots.txt.ts` emits a blanket `Disallow: /` under the same flag, as a second, independent layer - belt-and-suspenders in case the per-page meta tag is ever missed on some future page type.
- Both are verified directly against real build output, not asserted from the source: `PREVIEW_BUILD=true npm run build` followed by inspecting `dist/robots.txt` and a sampled page's rendered `<head>`.

## No production secrets or subscriber data

`pr-preview.yml`'s `permissions:` block grants only `contents: read`, and no step references any secret. This is structural, not a convention to remember: there is nothing in this workflow that *could* leak a production credential, because none is ever passed to it. It also never runs `scripts/ci/generate-real-approval-manifest.mjs` (which needs `GH_TOKEN` to query the GitHub API) - it uses the same locally-trusting manifest stand-in that `npm run build`'s `prebuild` hook already generates for local development, which is the correct choice here: a PR's content hasn't been approved yet, and a preview build's job is to show it, not to gate it.

## Performance budget

0.85 minimum Lighthouse performance score, not a stricter 0.9+, because this is the first real performance gate this project had - there was no prior baseline to calibrate a tighter number against. It already fails a genuine regression while leaving room to tighten once real scores across more routes and more content exist. Only the `performance` category is checked; accessibility is deliberately left to the dedicated axe-core suite rather than also asserted from Lighthouse's own (differently-tuned) accessibility audit, to avoid two tools disagreeing on the same question.

## Core Web Vitals budgets

Alongside the aggregate score, `scripts/verify-preview-performance.mjs` asserts three specific metrics against the targets `docs/adr/0003-analytics-platform.md`'s Phase-1 research cites (web.dev's 75th-percentile real-user targets): LCP ≤ 2500ms, CLS ≤ 0.1, and Total Blocking Time ≤ 200ms as the lab proxy for INP (INP itself requires a real user interaction and has no lab equivalent).

This is a synthetic/lab budget, not a literal enforcement of that real-user percentile - a single unthrottled Lighthouse run is one measurement, not a distribution. But it's the right number to hold a lab run to: if a single run on a quiet CI runner can't clear the budget real users are supposed to hit at their 75th percentile, that's a regression worth catching before it ships, not after. The full per-route numbers are written to the uploaded `preview-performance-<number>` artifact alongside the aggregate score.
