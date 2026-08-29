import { useState, useRef, useEffect } from 'react';
import { track } from '@/lib/analytics';
import { spanId } from '@/lib/span-id';

// The one React island in this checkpoint, and it's justified: docs/adr/0001
// requires the search index and UI load "only on the search page or after
// explicit focus," never on page load. The Pagefind runtime itself
// (public path: /pagefind/pagefind.js, emitted by the postbuild step) is
// loaded on first keystroke, not on mount - this component ships its own
// small JS, but the actual search index/engine stays lazy.
interface PagefindResult {
  id: string;
  data: () => Promise<{ url: string; meta: { title?: string }; excerpt: string }>;
}
interface PagefindModule {
  search: (query: string) => Promise<{ results: PagefindResult[] }>;
}

let pagefindLoadPromise: Promise<PagefindModule> | null = null;

/**
 * Same span-ID visual treatment as ArticleCard/ArticleLayout (src/lib/span-id.ts),
 * derived from a search result's URL rather than a CollectionEntry (the only
 * thing Pagefind's result data actually gives this component). Only articles
 * and briefs get one — a topic/series/methodology/etc. result's URL doesn't
 * match either prefix, and undefined means "don't render a span ID."
 */
function entrySpanId(url: string): string | undefined {
  const slug = /^\/(?:articles|brief)\/([^/]+)\/?$/.exec(url)?.[1];
  return slug ? spanId(slug) : undefined;
}

/**
 * Loads /pagefind/pagefind.js via a browser-native <script type="module" src>
 * pointed at public/search-loader.mjs (a genuinely static, un-bundled file) -
 * never via a bundler-visible import() or `new Function`/`eval`. This needs only
 * `script-src 'self'` under a restrictive CSP; it never requires `unsafe-eval`.
 * See public/search-loader.mjs for why a plain import() can't be used directly.
 */
function loadPagefind(): Promise<PagefindModule> {
  if (pagefindLoadPromise) return pagefindLoadPromise;

  pagefindLoadPromise = new Promise((resolve, reject) => {
    const onReady = (event: Event) => {
      cleanup();
      resolve((event as CustomEvent<PagefindModule>).detail);
    };
    const onError = (event: Event) => {
      cleanup();
      pagefindLoadPromise = null; // allow retry on a later keystroke
      reject((event as CustomEvent<unknown>).detail ?? new Error('Failed to load Pagefind'));
    };
    function cleanup() {
      window.removeEventListener('pagefind:ready', onReady);
      window.removeEventListener('pagefind:error', onError);
    }
    window.addEventListener('pagefind:ready', onReady, { once: true });
    window.addEventListener('pagefind:error', onError, { once: true });

    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/search-loader.mjs';
    script.onerror = () => {
      cleanup();
      pagefindLoadPromise = null;
      reject(new Error('Failed to load /search-loader.mjs'));
    };
    document.head.appendChild(script);
  });

  return pagefindLoadPromise;
}

// Filter UI (topic/author/series/date) is explicitly deferred, not silently
// dropped: data-pagefind-filter attributes are already indexed (ArticleLayout.astro)
// and pagefind.search() accepts a `filters` option against them, but no control
// here exposes it yet. Flagged by external review of Checkpoint 2 — tracked
// here rather than built speculatively; wire up when a real filtering need
// appears (e.g. once /articles listing gets its own topic filter, the same
// pattern extends naturally to search).
export default function SearchIsland() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    { url: string; title: string; excerpt: string; spanId?: string }[]
  >([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  // A slower earlier query resolving after a faster later one must not overwrite
  // fresher results - every request is tagged with a generation counter, and a
  // response is applied only if it's still the most recent request in flight.
  const requestGeneration = useRef(0);
  // client:idle (astro.config.mjs / src/pages/search.astro) means hydration
  // can genuinely be delayed under main-thread contention - a real
  // production edge case (a very busy device, e.g. a low-powered phone under
  // load), not just a test artifact: it's also what caused real,
  // reproducible test flakiness under Playwright's parallel workers, where
  // .fill() could race ahead of React actually attaching its onChange
  // handler, silently losing the keystroke. This flag gives both real users
  // and tests an observable "is this actually interactive yet" signal
  // instead of the input merely being present in SSR'd markup.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  async function handleChange(value: string) {
    setQuery(value);
    const generation = ++requestGeneration.current;

    if (value.trim().length < 2) {
      setResults([]);
      setStatus('idle');
      return;
    }

    setStatus('loading');
    try {
      const pagefind = await loadPagefind();
      if (requestGeneration.current !== generation) return; // superseded while loading

      const search = await pagefind.search(value);
      if (requestGeneration.current !== generation) return; // superseded while searching

      const withData = await Promise.all(
        search.results.slice(0, 10).map(async (r) => {
          const data = await r.data();
          return {
            url: data.url,
            title: data.meta.title ?? data.url,
            excerpt: data.excerpt,
            spanId: entrySpanId(data.url),
          };
        }),
      );
      if (requestGeneration.current !== generation) return; // superseded while fetching results

      setResults(withData);
      setStatus('ready');
      // Fired once per settled (non-superseded) search, not per keystroke -
      // ADR-0003: property is a count, never the query text itself.
      track({ name: 'search_submit', properties: { resultCount: withData.length } });
    } catch {
      if (requestGeneration.current !== generation) return;
      setStatus('error');
      setResults([]);
    }
  }

  return (
    <div className="search-island" data-hydrated={hydrated}>
      <label htmlFor="search-input" className="visually-hidden">
        Search Runtime Signals
      </label>
      <input
        id="search-input"
        type="search"
        value={query}
        placeholder="Search articles, briefs, and sources…"
        onChange={(e) => handleChange(e.target.value)}
        className="search-island__input"
        autoComplete="off"
      />
      {status === 'loading' && <p className="search-island__status">Loading search index…</p>}
      {status === 'error' && (
        <p className="search-island__status search-island__status--error">
          Search is unavailable right now. Browse <a href="/articles">all articles</a> or{' '}
          <a href="/topics">topics</a> instead.
        </p>
      )}
      {status === 'ready' && results.length === 0 && (
        <p className="search-island__status">No results for &ldquo;{query}&rdquo;.</p>
      )}
      {results.length > 0 && (
        <ul className="search-island__results">
          {results.map((r) => (
            <li key={r.url}>
              <a href={r.url}>
                {r.spanId && (
                  <span className="span-id search-island__span-id" aria-hidden="true">
                    {r.spanId}
                  </span>
                )}
                {r.title}
              </a>
              {/* Pagefind's own excerpt-generation API, not raw query/content -
                  the exact boundary docs/adr/0001's XSS mitigation requires. */}
              <p dangerouslySetInnerHTML={{ __html: r.excerpt }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
