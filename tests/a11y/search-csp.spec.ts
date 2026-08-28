import { test, expect } from '@playwright/test';

// Proves the search island's Pagefind loader (public/search-loader.mjs, loaded via
// a browser-native <script type="module" src>, never `new Function`/`eval`) works
// under the site's real, always-on CSP — astro.config.mjs `security.csp`, which
// Astro renders as a <meta> tag with hash-based allowances for its own inline
// hydration scripts/styles plus an explicit resources entry for
// /search-loader.mjs. No route interception needed: this is the actual policy
// every real page load already carries, not a synthetic one built for the test.
test('search works end to end under the site real CSP, with no unsafe-eval anywhere in it', async ({
  page,
}) => {
  const violations: string[] = [];
  await page.addInitScript(() => {
    window.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __cspViolations: string[] }).__cspViolations ??= [];
      (window as unknown as { __cspViolations: string[] }).__cspViolations.push(
        `${e.violatedDirective}: ${e.blockedURI}`,
      );
    });
  });

  await page.goto('/search');

  const cspContent = await page
    .locator('meta[http-equiv="content-security-policy"]')
    .getAttribute('content');
  expect(cspContent, 'the real page should carry a CSP meta tag').toBeTruthy();
  expect(cspContent).not.toContain('unsafe-eval');

  const input = page.getByLabel('Search Runtime Signals');
  await input.fill('handoff');
  // "handoff" legitimately appears across several pages (the home feed teaser,
  // topic hubs, the series page) — this asserts real results came back and the
  // article that actually discusses the term ranks first, not an exact count.
  await expect(page.locator('.search-island__results li').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.search-island__results a').first()).toHaveAttribute(
    'href',
    /model-handoff-as-distributed-state-transfer/,
  );

  const collected = await page.evaluate(
    () => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? [],
  );
  violations.push(...collected);
  expect(violations, `CSP violations: ${JSON.stringify(violations)}`).toEqual([]);
});
