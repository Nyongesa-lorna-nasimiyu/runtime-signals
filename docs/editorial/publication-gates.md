# Publication gates

Date: 2026-08-28

An article cannot publish unless all checks pass and protected-branch review is recorded.

## Automated gate

- Content schema valid; unique slug; valid canonical URL.
- Required title, description, author, topic, type, and publication date.
- No draft flag; state is approved/scheduled according to policy.
- Every structured source resolves; required claims have citations.
- Internal links, images, dimensions, alt text, and redirects resolve.
- No prohibited executable MDX or untrusted component import.
- Article/Breadcrumb/Person/Organization/WebSite JSON-LD validates and matches visible content.
- Feed, sitemap, and robots output succeeds.
- Astro build, accessibility, responsive, and performance checks pass.

## Human gate

- Technical reviewer confirms invariants, code, configuration, and limitations.
- Editor confirms structure, voice, source quality, and corrections posture.
- Maintainer confirms protected PR approvals and deployment environment approval.

## Approval representation

The authoritative approval is a merged PR whose required checks include `publication-gate` and whose branch protection requires the appropriate CODEOWNERS reviewers. Frontmatter can express intent (`status: scheduled`) but cannot grant permission - the build never reads an `approval` or similar boolean out of content frontmatter, because anyone who can edit content can set it.

Concretely, the gate is two independent checks that must both pass, and only the second is authorization:

1. **Content validation** (`isContentValid` / `isPublishable` in `docs/poc/publication-gate/validate.mjs`): schema-shape and timing only - status, required fields, source presence, `published_at <= now`. This can run on any commit, including an unreviewed one, and proves nothing about permission to publish.
2. **Authorization** (`isApproved`): checked only against a CI-generated approval manifest keyed by canonical URL, containing the exact reviewed `commit_sha`, required-check-run result, CODEOWNERS approval, and deployment-environment authorization. It is never derived from the record's own frontmatter. If content is edited after approval (a new commit SHA), the manifest entry for the old SHA no longer matches and the record is excluded until re-reviewed - see `docs/poc/scheduled-publish/idempotency.test.mjs` ("content edited after approval is excluded until the manifest is updated for the new commit").

Store reviewer identities, PR number, commit SHA, check-run IDs, and deployment ID in the build manifest.

## Emergency unpublish

Remove or change the content in Git, add a redirect or `410` policy as appropriate, rebuild, and verify the deployed artifact. Do not delete history or rewrite the public URL without two-person review.
