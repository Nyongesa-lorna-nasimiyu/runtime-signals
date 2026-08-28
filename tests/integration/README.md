# Why this directory is nearly empty

`getCollection()` from `astro:content` is unreliable inside a standalone `vitest run` —
this is a documented, known-flaky combination (see
[withastro/astro#7051](https://github.com/withastro/astro/issues/7051) and multiple
community write-ups on mocking `astro:content` for Vitest): the content layer's glob
loader depends on lifecycle hooks that a plain Vitest invocation doesn't reliably
trigger the same way `astro dev`/`astro build` do, so collections can come back
empty even with `getViteConfig()` wired up correctly and `astro sync` run first —
both of which this project has.

Two vitest-based integration tests were written and then deleted for this reason
rather than kept in a flaky, sometimes-red state. The properties they were meant to
prove are instead proven against the real thing:

- **Content Collections schema validation**: proven by `astro check` and `astro
build` succeeding against every real committed fixture (they would fail loudly on
  an invalid one — verified manually once by temporarily committing an invalid
  fixture; see the Phase 2 checkpoint report for the exact rejection output), plus
  the pure business-rule unit test in `tests/unit/claims.test.ts`.
- **Draft/future/unapproved/archived exclusion**: proven by
  `scripts/verify-draft-exclusion.mjs`, a black-box check that inspects the actual
  `dist/` output of a real `astro build` — stronger than a mocked test, because it
  can only pass if the real build pipeline (content collections, `getStaticPaths`,
  the approval manifest, and routing) actually behaves correctly end to end.

`tests/unit/` covers the pure logic (`publication.ts`, `approval.ts`, `claims.ts`)
directly with hand-built fixtures, with no dependency on the content layer at all.
