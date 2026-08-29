import { useState, useRef } from 'react';

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
  const [results, setResults] = useState<{ url: string; title: string; excerpt: string }[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  // A slower earlier query resolving after a faster later one must not overwrite
  // fresher results - every request is tagged with a generation counter, and a
  // response is applied only if it's still the most recent request in flight.
  const requestGeneration = useRef(0);

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
          return { url: data.url, title: data.meta.title ?? data.url, excerpt: data.excerpt };
        }),
      );
      if (requestGeneration.current !== generation) return; // superseded while fetching results

      setResults(withData);
      setStatus('ready');
    } catch {
      if (requestGeneration.current !== generation) return;
      setStatus('error');
      setResults([]);
    }
  }

  return (
    <div className="search-island">
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
              <a href={r.url}>{r.title}</a>
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
