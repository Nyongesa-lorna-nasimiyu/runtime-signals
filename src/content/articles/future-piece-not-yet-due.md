---
title: A piece scheduled for the future
dek: This fixture proves scheduled content with a future published_at never gets a route until its time passes.
status: scheduled
kind: article
authors: [jordan-avery]
topics: [reliability]
published_at: 2099-01-01T07:00:00Z
reading_time_minutes: 3
claims: []
---

This fixture exists to prove not-yet-due scheduled content never gets a public route — see
tests/integration/draft-exclusion.test.ts and scripts/verify-draft-exclusion.mjs.
