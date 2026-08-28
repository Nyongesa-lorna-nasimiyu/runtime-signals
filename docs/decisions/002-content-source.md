# ADR 002: Git-backed Markdown with typed sources

Status: proposed

Date: 2026-08-28

## Decision

Store article bodies, frontmatter, authors, topics, series, and source records in Git-backed files. Render Markdown with typed Astro content collections. Use allow-listed components for diagrams, callouts, timelines, and simulations. Do not accept arbitrary external MDX as executable content.

## Rationale

Git gives the editorial process reviewable diffs, reproducible builds, durable history, easy backup, and natural correction records. Typed source records make the evidence layer queryable without inventing a graph database. MDX is intentionally not the default because its own documentation treats it as executable code and warns against untrusted authors.

## Editorial tradeoff

The system is less friendly to non-technical authors than a visual CMS. Phase 3 may add a database-backed editorial queue and preview UI if Git-only workflow is a measured bottleneck, but approved publication should still result in a reviewed, reproducible content snapshot.
