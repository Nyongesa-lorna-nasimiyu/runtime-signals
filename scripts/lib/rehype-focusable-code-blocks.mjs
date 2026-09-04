import { visit } from 'unist-util-visit';

/**
 * A horizontally-scrollable <pre> (any code block wider than its container -
 * see .article__body pre { overflow-x: auto } in ArticleLayout.astro) must be
 * reachable by keyboard, or a sighted keyboard-only user simply cannot read the
 * part that scrolled off-screen. This is WCAG 2.1.1/2.1.3, caught by axe-core's
 * "scrollable-region-focusable" rule (tests/a11y/basic.spec.ts) against the real
 * fenced code block added when the Shiki -> Prism CSP fix needed a real example
 * to prove itself against. Adds tabindex="0" and a labeled region role to every
 * Prism-highlighted <pre class="language-*">.
 */
export function rehypeFocusableCodeBlocks() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'pre') return;
      const codeChild = node.children?.find((c) => c.type === 'element' && c.tagName === 'code');
      const className = codeChild?.properties?.className;
      const languageClass = Array.isArray(className)
        ? className.find((c) => typeof c === 'string' && c.startsWith('language-'))
        : undefined;
      if (!languageClass) return;

      const language = languageClass.replace('language-', '');
      node.properties = {
        ...node.properties,
        tabIndex: 0,
        role: 'region',
        'aria-label': `Code sample${language && language !== 'text' ? ` (${language})` : ''}`,
      };
    });
  };
}
