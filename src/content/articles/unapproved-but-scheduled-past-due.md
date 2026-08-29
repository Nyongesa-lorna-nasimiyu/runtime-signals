---
title: Scheduled, past due, and deliberately unapproved
dek: This fixture is content-valid and past its publish time, but excluded from the approval manifest - it must never route.
status: scheduled
kind: article
authors: [jordan-avery]
topics: [reliability]
published_at: 2026-01-01T07:00:00Z
reading_time_minutes: 3
claims: []
---

This fixture is deliberately excluded from approval-manifest.local.json by
scripts/generate-approval-manifest.mjs (see FIXTURE_UNAPPROVED_IDS) even though it is
content-valid and past its scheduled time. It proves content validity and timing alone are not
sufficient to publish - authorization from the approval manifest is required too. See
docs/poc/publication-gate/validate.test.mjs for the same property proven in isolation.
