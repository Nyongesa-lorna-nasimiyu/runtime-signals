import { test, expect } from '@playwright/test';

// Representative routes, not every route: home (hero + signal log), an
// article (the richest template — claims, sources, revision history), a
// listing page, a utility/policy page, search, and 404. Each project in
// playwright.config.ts runs this same set at a different viewport/color
// scheme, so the real coverage is routes × (desktop light, desktop dark,
// mobile light).
const ROUTES: [name: string, path: string][] = [
  ['home', '/'],
  ['article', '/articles/model-handoff-as-distributed-state-transfer'],
  ['article-table', '/articles/executing-agent-workflows'],
  ['topics-index', '/topics'],
  ['methodology', '/methodology'],
  ['search-empty', '/search'],
  ['not-found', '/404'],
];

for (const [name, path] of ROUTES) {
  test(`${name} matches its visual baseline`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}

test('topic cards have equal heights', async ({ page }) => {
  await page.goto('/topics');
  const heights = await page
    .locator('.topic-card')
    .evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().height));

  expect(new Set(heights).size).toBe(1);
});
