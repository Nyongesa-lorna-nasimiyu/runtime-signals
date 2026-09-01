---
title: Agent Engineering Brief - content-collection validation as a publication gate
dek: What Astro's schema validation actually catches before a bad record ever reaches a route.
status: published
authors: [jordan-avery]
topics: [reliability]
published_at: 2026-06-05T07:00:00Z
reading_time_minutes: 3
seo:
  title: Content validation as a publication gate
claims:
  - id: claim.astro.schema-validation
    text: Astro Content Collections validate frontmatter against a typed schema at build time, before a page is generated.
    evidence: supported
    sources: [astro-content-collections]
citations: [astro-content-collections]
---

A quick note this week: schema validation is a publication-gate control, not a developer
convenience. A claim labeled `supported` or `mixed` with no source now fails the build outright -
see `src/content.config.ts`, `requireSourcesForStrongClaims`. That's a stronger guarantee than a
lint warning: the site simply doesn't build until the record is fixed.
