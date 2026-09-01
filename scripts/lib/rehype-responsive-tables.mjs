/**
 * Wrap Markdown tables in a labeled, keyboard-focusable overflow region.
 *
 * Tables are intentionally allowed to keep a readable minimum width on small
 * screens; the wrapper provides the horizontal scroll container instead of
 * clipping the final columns. A focusable region gives keyboard users the same
 * scroll affordance as pointer users, mirroring the code-block treatment.
 */
export function rehypeResponsiveTables() {
  return (tree) => wrapTables(tree);
}

function wrapTables(node) {
  if (!Array.isArray(node.children)) return;

  node.children = node.children.map((child) => {
    if (child.type === 'element' && child.tagName === 'table') {
      wrapTables(child);
      return {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['table-scroll'],
          tabIndex: 0,
          role: 'region',
          'aria-label': 'Scrollable data table',
        },
        children: [child],
      };
    }

    wrapTables(child);
    return child;
  });
}
