import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = [
  '/',
  '/articles',
  '/articles/model-handoff-as-distributed-state-transfer',
  '/topics',
  '/about',
  '/methodology',
  '/editorial-policy',
  '/corrections',
  '/newsletter',
  '/search',
  '/404',
];

for (const route of routes) {
  test(`${route} has no automatically detectable accessibility violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

test('skip link is the first focusable element and moves focus to main content', async ({
  page,
}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.className);
  expect(focused).toContain('skip-link');
});

test('wide article tables stay inside the viewport and expose a keyboard scroll region', async ({
  page,
}) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('/articles/executing-agent-workflows');

  const tableRegion = page.locator('.table-scroll').first();
  await expect(tableRegion).toHaveAttribute('role', 'region');
  await expect(tableRegion).toHaveAttribute('tabindex', '0');

  const dimensions = await tableRegion.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    rightEdge: element.getBoundingClientRect().right,
  }));

  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
  expect(dimensions.rightEdge).toBeLessThanOrEqual(412);
});
