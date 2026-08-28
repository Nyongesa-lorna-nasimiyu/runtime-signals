# ADR 001: Static-first public architecture

Status: proposed

Date: 2026-08-28

## Context

The publication needs crawlable article HTML, excellent mobile performance, progressive enhancement, RSS/sitemap generation, and interactive explainers without turning every article into a client-rendered application.

## Decision

Use Astro static generation for the public site. Use React 19 islands only for interaction that materially improves understanding or navigation. Deploy static output with Cloudflare Workers + Static Assets. Do not add Convex or Express in the initial release; add a bounded Worker route or database only when a documented dynamic requirement appears.

## Options considered

- **Astro**: strongest static/content model and smallest default browser payload; requires discipline when adding React islands.
- **TanStack Start**: capable SSR/prerendering and excellent TypeScript routing; current RSC/deferred-hydration features are experimental and the site does not need a full-stack React runtime for the public surface.
- **Next.js**: mature hybrid rendering and metadata conventions; more framework/runtime surface than the article-first public site needs, and easier to accidentally ship more client/server complexity.
- **React + TanStack Router SPA**: excellent application routing; fails the requirement that article HTML not depend on client rendering unless paired with another SSR layer.

## Consequences

Positive: static HTML, easy CDN caching, low operating cost, clear SEO behavior, content builds are reproducible.

Negative: a publish requires a build/deploy; dynamic search and editorial tools are separate concerns; interactive components need an explicit island boundary.

## Revisit when

The public surface needs highly personalized or real-time rendering, or build times and content scale make static generation a bottleneck. Until then, add a bounded server endpoint rather than replacing the whole architecture.
