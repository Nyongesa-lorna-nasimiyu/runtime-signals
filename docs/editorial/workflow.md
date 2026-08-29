# Editorial workflow

Date: 2026-08-28

This document defines `editorial_state`: the research-and-review workflow only. It is tracked in the GitHub issue/PR/project, not in content frontmatter, and it has no authority to publish anything. The separate, reader-facing `publication_state` (`draft → scheduled → published → archived`) and the authorization boundary between the two live in `docs/architecture/content-model.md` ("Two state machines") and `docs/editorial/publication-gates.md`. In particular: reaching `editorial-complete` here is necessary but not sufficient for publication - the build-time approval manifest (protected-branch review, required checks, CODEOWNERS, deployment-environment authorization) must independently authorize the exact commit before `publication_state` can move to `published`.

## States and ownership

| State | Owner | Required evidence / exit condition |
| --- | --- | --- |
| idea | Editor | Concrete systems problem and intended reader |
| researching | Researcher | Source cards created; primary-source search started |
| source-verified | Researcher + technical reviewer | Claims mapped to sources; source type and limits recorded |
| outlined | Author | Invariant, failure mechanism, practice, and limitations specified |
| drafting | Author | Draft uses structured citations and no unresolved claim markers |
| technical-review | Engineer | Code/configuration/claim review complete; reproducibility checked |
| editorial-review | Editor | Voice, structure, title, links, accessibility, and evidence complete |
| editorial-complete | Editor | Editorial work is done and the PR is ready to request the required CODEOWNERS/`publication-gate` review; this state records readiness, it does not itself authorize publication |
| monitoring | Editor | Runs only after `publication_state` independently reaches `published`; search, corrections, links, and source changes reviewed |
| update-required | Editor | Trigger recorded: source change, broken practice, or material error |
| revised | Author | Revision notes and changed claims identified; loops back to `technical-review` |

There is no `archived` value in `editorial_state`. When monitoring concludes that an article should stop being actively promoted, the action taken is a `publication_state` transition to `archived` (recorded per `docs/architecture/content-model.md`), not a new editorial state.

## Research source card

Each candidate stores: canonical URL, title, authors, publisher, publication date, discovery date, source type, primary/secondary classification, topics, novelty, reproducibility, code/dataset availability, production evidence, credibility notes, duplicate IDs, previous coverage, editorial status, and license/access constraints.

Deduplicate in this order: DOI, arXiv ID, canonical URL, repository plus release ID, normalized title plus author/year. A dedupe match is a review signal, not an automatic deletion.

## Source families

Use arXiv API/feeds, official engineering blogs, primary repositories, GitHub releases, standards repositories, OpenTelemetry conventions, Langfuse releases/issues, agent-framework releases, production engineering reports, benchmarks, and datasets. Secondary commentary can discover a lead but should not be the sole support for a consequential claim.

## Daily shape

Monday–Thursday: 500–900-word focused engineering posts. Friday: concise Agent Engineering Brief. Monthly: synthesis/report. Periodically: implementation guide, experiment, or case study. Daily output is permitted only while the backlog contains at least 15 reviewed seeds and two weeks of drafted material.
