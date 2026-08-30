---
title: 'Weekly Brief: Treat content schema as a publication control'
dek: Use typed claims and source references to stop unsupported assertions before a route exists.
status: scheduled
authors: [jordan-avery]
topics: [reliability, evaluation]
published_at: 2026-11-06T07:00:00Z
reading_time_minutes: 3
claims:
  - id: claim.brief.content-schema
    text: Astro Content Collections validate content against a schema during the build pipeline.
    evidence: supported
    sources: [astro-content-collections]
citations: [astro-content-collections]
---

Draft brief for the editorial-systems cluster. A typed content record can require an author, topic,
publication state, and sources for supported claims. Astro documents [schema validation for content
collections](https://docs.astro.build/en/guides/content-collections/); this repository extends that
idea with evidence-strength checks.

Action: add one deliberately unsupported `supported` claim in a local branch, confirm the build
fails, then repair it with a source or mark the statement as inference.
