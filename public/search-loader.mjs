// A genuinely static file (public/ is never processed by Vite/Rollup, only copied
// verbatim) whose only job is to import the Pagefind runtime that the `pagefind`
// CLI writes to /pagefind/ after the build (package.json "postbuild"). Because
// Rollup never sees this file's contents, this import() is never subject to the
// "Could not resolve /pagefind/pagefind.js" build-time failure that a bundled
// import() (even with /* @vite-ignore */ or variable indirection) hits - see
// src/components/SearchIsland.tsx for what that failure looked like and why.
//
// Loaded via a browser-native `<script type="module" src="...">` element (see
// SearchIsland.tsx), never via `new Function` or `eval` - this needs only
// `script-src 'self'` under a restrictive CSP, never `unsafe-eval`.
import('/pagefind/pagefind.js')
  .then((pagefind) => {
    window.dispatchEvent(new CustomEvent('pagefind:ready', { detail: pagefind }));
  })
  .catch((error) => {
    window.dispatchEvent(new CustomEvent('pagefind:error', { detail: error }));
  });
