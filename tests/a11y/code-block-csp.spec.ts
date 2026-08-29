import { test, expect } from '@playwright/test';

// Proves the Shiki -> Prism decision (astro.config.mjs) actually resolves the CSP
// conflict, against a real fenced code block in real content - not asserted, not
// a fixture built just for this test. If a future article's code block somehow
// reintroduces inline styles (a Shiki regression, a copy-pasted inline style in
// MDX, etc.), this fails.
test('a real article with a fenced code block renders correctly under the site real CSP', async ({
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

  await page.goto('/articles/model-handoff-as-distributed-state-transfer');

  const codeBlock = page.locator('pre[class*="language-"]');
  await expect(codeBlock).toBeVisible();
  await expect(codeBlock.locator('.token.keyword').first()).toBeVisible();
  // No inline style attribute anywhere in the highlighted output - the entire
  // point of Prism over Shiki here.
  const inlineStyledTokens = await page.locator('pre[class*="language-"] [style]').count();
  expect(inlineStyledTokens).toBe(0);

  const collected = await page.evaluate(
    () => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? [],
  );
  violations.push(...collected);
  expect(violations, `CSP violations: ${JSON.stringify(violations)}`).toEqual([]);
});
