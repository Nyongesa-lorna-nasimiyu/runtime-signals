import { test, expect } from '@playwright/test';

// Real print-media emulation (page.emulateMedia), not a screenshot eyeballed
// once. Runtime Signals' audience is plausibly the kind of reader who prints a
// technical piece to keep - see src/styles/global.css's @media print block.
test.describe('print styles', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ media: 'print' });
  });

  test('site chrome is hidden and the article content remains', async ({ page }) => {
    await page.goto('/articles/model-handoff-as-distributed-state-transfer');
    await expect(page.locator('.site-header')).toBeHidden();
    await expect(page.locator('.site-footer')).toBeHidden();
    await expect(page.locator('.skip-link')).toBeHidden();
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.article__body')).toBeVisible();
  });

  test('an external source link has its URL appended for print, an internal link does not', async ({
    page,
  }) => {
    await page.goto('/articles/model-handoff-as-distributed-state-transfer');
    const externalLink = page.locator('.article__sources-list a').first();
    const externalContent = await externalLink.evaluate(
      (el) => getComputedStyle(el, '::after').content,
    );
    expect(externalContent).toContain('opentelemetry.io');

    const internalLink = page.locator('.article__series a[href^="/series/"]').first();
    const internalContent = await internalLink.evaluate(
      (el) => getComputedStyle(el, '::after').content,
    );
    expect(internalContent).toBe('none');
  });
});
