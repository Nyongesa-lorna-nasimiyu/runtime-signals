# PR editorial quality report

Date: 2026-08-29

An advisory comment posted on every PR that touches `src/content/articles/` or `src/content/briefs/`, surfacing four signals a reviewer would otherwise have to check by eye. It never blocks anything - `.github/workflows/pr-editorial-report.yml` has no bearing on `publication-gate`'s required status or on branch protection. Human review and CODEOWNERS approval remain the actual authorization, exactly as `docs/editorial/publication-gates.md` describes.

## What it reports, per changed article/brief

**SEO preview** - how the piece's title and description would render in a search result, plus the same length guidelines a real SEO review would apply (roughly 60 characters for a title before truncation, 50-160 for a description).

**Possible duplicate coverage** - other existing pieces whose title and dek overlap this one's beyond a similarity threshold (word-overlap based, deliberately lenient - a false positive costs one glance at a report, a false negative costs a silently duplicated article). A confirmation prompt for the editor, not a verdict.

**Internal-link suggestions** - other articles, briefs, or topics whose title is mentioned in this piece's body as plain text but isn't already a markdown link. Caught a real one on the first run against this repo's own content: `model-handoff-as-distributed-state-transfer.md` mentioned "orchestration" in its Limitations section without linking to `/topics/orchestration`, despite the article being tagged with that topic - fixed as part of landing this feature.

**Citation and source coverage** - a tally of the piece's claims by evidence strength (supported/mixed/inference/opinion) and what fraction are `supported`. A coarse signal, not a substitute for `docs/editorial/source-policy.md`'s actual review.

## Why a PR comment, not a required check

A required check has to have a pass/fail verdict; these four signals don't - "this title is 67 characters" isn't wrong, it's information for a human to weigh. Posting as a comment keeps that distinction structural: `pr-editorial-report.yml` can never turn red and block a merge, because it has no conclusion to report beyond "the comment was posted."

Repeated pushes to the same PR update one comment (matched by a hidden `<!-- runtime-signals-editorial-report -->` marker) rather than posting a new one each time.

## Permissions

The only workflow in this repository with any write permission beyond `contents: read` - scoped to exactly `pull-requests: write`, needed to post/update the comment. Nothing else.

## Duplicate-topic detection: interpretation note

The original brief for this checkpoint said "duplicate-topic detection." This implementation interprets that as duplicate *article coverage* (two pieces about substantially the same thing) rather than duplicate entries in the `topics` content collection itself (e.g. two YAML files both meaning "reliability"). The collection-level version would be a much smaller, differently-shaped check - a name/description similarity pass over `src/content/topics/*.yaml`, run once per PR touching that directory - and can be added later if the taxonomy grows large enough for that to become a real risk; at three topics today, it isn't.
