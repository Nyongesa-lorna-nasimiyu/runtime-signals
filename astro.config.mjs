import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { excludedSitemapPaths } from './scripts/lib/content-status.mjs';
import { rehypeFocusableCodeBlocks } from './scripts/lib/rehype-focusable-code-blocks.mjs';
import { rehypeResponsiveTables } from './scripts/lib/rehype-responsive-tables.mjs';

// Computed once at config-eval time - astro.config.mjs runs before the content
// layer exists, so this can't use astro:content and instead reads frontmatter
// directly (scripts/lib/content-status.mjs). Archived content keeps a real,
// working URL (docs/architecture/content-model.md) but must never be promoted
// through the sitemap - this was a real bug in the first Phase 2 checkpoint,
// caught by external review: the verification script asserted archived content
// was absent from the sitemap without the sitemap integration actually excluding
// it, so nothing had ever checked it.
const sitemapExclusions = excludedSitemapPaths();

// Fully static output: no adapter. docs/architecture/overview.md ("Locked-by-default
// boundaries") commits to public reading that never depends on a request-time backend,
// and docs/decisions/003-backend-boundary.md rules out a server runtime until a
// concrete dynamic requirement appears. Cloudflare Workers Static Assets is configured
// directly in wrangler.jsonc against this static `dist/` output, which is how
// docs/adr/0001 through 0004 already describe deployment - an SSR adapter is deferred
// architecture, not launch architecture (see overview.md "Deferred architecture" #1).
export default defineConfig({
  site: 'https://runtimesignals.tech',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
  security: {
    csp: {
      // 'self' is the correct, valid way to allow the runtime-injected
      // <script src="/search-loader.mjs"> (a same-origin URL, not something Astro
      // can hash at build time since it's created via DOM API, not present in the
      // static HTML) - a bare path like "/search-loader.mjs" is not a valid CSP
      // source-list entry and Chromium silently ignores it with a console warning,
      // caught only by actually running the browser and reading its console.
      scriptDirective: {
        resources: ["'self'"],
      },
    },
  },
  integrations: [
    react(),
    mdx(),
    sitemap({
      // Draft/scheduled/unapproved content never reaches getStaticPaths, so it never
      // becomes a route for the sitemap integration to discover in the first place
      // - see src/lib/publication.ts. Archived/noindex content DOES get a route (a
      // deliberate design choice, for stable URLs) and must be excluded here explicitly.
      filter: (page) => {
        const path = new URL(page).pathname.replace(/\/$/, '');
        return !page.includes('/404') && !sitemapExclusions.has(path);
      },
    }),
  ],
  // Resolved: Prism, not Shiki. Shiki emits inline per-token styles that a
  // strict style-src can't hash the way Astro hashes its own static styles -
  // Astro's own CSP docs say Shiki is unsupported under `security.csp` for
  // exactly this reason. Prism uses only CSS classes (public/prism-theme.css,
  // a bespoke token-driven theme, not a third-party stylesheet), so it needs no
  // CSP allowance beyond the site's existing same-origin stylesheet loading.
  // Proven, not assumed: tests/a11y/code-block-csp.spec.ts renders a real fenced
  // code block under the site's real CSP and asserts zero violations.
  markdown: {
    syntaxHighlight: 'prism',
    // markdown.rehypePlugins is deprecated in favor of a configured processor -
    // caught by a real deprecation warning in `npm test`, not by reading changelogs.
    processor: unified({
      rehypePlugins: [rehypeFocusableCodeBlocks, rehypeResponsiveTables],
    }),
  },
  vite: {
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  },
});
