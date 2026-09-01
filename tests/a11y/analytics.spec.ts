import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Proves the bounded interaction-event contract (docs/adr/0003-analytics-platform.md,
// 2026-08-29 amendment) actually fires against the real built site, in a real
// browser - not just that the bundled script contains no leftover `import`
// statement (a real bug this exact test caught during development: an
// earlier version used Astro's define:vars, which forces a non-module inline
// script and would have thrown "Cannot use import statement outside a
// module" on first page load in any real browser).
//
// Listens for the harmless `runtimesignals:analytics` DOM event
// (src/lib/analytics.ts's `send`) rather than depending on dev-only console
// output, which a production-mode build like this one never produces.
type RecordedEvent = { name: string; properties: Record<string, unknown> };

async function collectAnalyticsEvents(page: Page) {
  const events: RecordedEvent[] = [];
  await page.exposeFunction('__recordAnalyticsEvent', (e: RecordedEvent) => events.push(e));
  await page.addInitScript(() => {
    window.addEventListener('runtimesignals:analytics', (e) => {
      (
        window as unknown as { __recordAnalyticsEvent: (e: unknown) => void }
      ).__recordAnalyticsEvent((e as CustomEvent).detail);
    });
  });
  return events;
}

test('article_view fires on load with the real slug and topics, no PII/query data anywhere', async ({
  page,
}) => {
  const events = await collectAnalyticsEvents(page);
  await page.goto('/articles/model-handoff-as-distributed-state-transfer');
  await page.waitForTimeout(300);

  const articleView = events.find((e) => e.name === 'article_view');
  expect(articleView).toBeTruthy();
  expect(articleView?.properties).toEqual({
    slug: 'model-handoff-as-distributed-state-transfer',
    topics: ['Orchestration', 'State & Memory'],
  });
});

test('artifact_open fires on a real click with the artifact id, not the URL or title', async ({
  page,
}) => {
  const events = await collectAnalyticsEvents(page);
  await page.goto('/articles/model-handoff-as-distributed-state-transfer');

  const link = page.locator('.article__artifacts-list a[data-artifact-id]').first();
  await expect(link).toBeVisible();
  // Prevent the real (placeholder) external navigation from interfering with
  // this test's assertions - the click handler itself is what's under test.
  await link.evaluate((el) => el.removeAttribute('href'));
  await link.click();
  await page.waitForTimeout(200);

  const artifactOpen = events.find((e) => e.name === 'artifact_open');
  expect(artifactOpen?.properties).toEqual({ artifactId: 'handoff-simulation' });
});

test('search_submit fires once per settled search with a result count, never the query text', async ({
  page,
}) => {
  const events = await collectAnalyticsEvents(page);
  await page.goto('/search');

  // See search-csp.spec.ts's comment: client:idle hydration can be delayed
  // under CPU contention, so wait for the real hydration signal before
  // filling, not just for the (SSR'd, pre-hydration) input to exist.
  await expect(page.locator('.search-island[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel('Search Runtime Signals').fill('handoff');
  await expect(page.locator('.search-island__results li').first()).toBeVisible({
    timeout: 10_000,
  });
  await page.waitForTimeout(200);

  const searchSubmit = events.find((e) => e.name === 'search_submit');
  expect(searchSubmit).toBeTruthy();
  expect(typeof searchSubmit?.properties.resultCount).toBe('number');
  expect(searchSubmit?.properties.resultCount as number).toBeGreaterThan(0);
  // The literal query string must never appear in a tracked event's
  // properties - ADR-0003 explicitly forbids "free-form search queries."
  expect(JSON.stringify(searchSubmit?.properties)).not.toContain('handoff');
});
