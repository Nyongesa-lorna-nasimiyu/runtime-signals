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
interface PagefindSearchOptions {
  filters?: Record<string, { any: string[] }>;
}
interface PagefindModule {
  search: (
    query: string | null,
    options?: PagefindSearchOptions,
  ) => Promise<{ results: PagefindResult[] }>;
  filters: () => Promise<Record<string, Record<string, number>>>;
}

// The three facets exposed in the UI. `date[datetime]` is also indexed
// (ArticleLayout.astro) but its filter value is a full ISO timestamp - one
// distinct value per article - which makes it useless as a checkbox list
// rather than a real range/year control; surfacing it as-is would just be a
// list of unlabeled dates. Left out here, not silently dropped from the
// index - the underlying data-pagefind-filter attribute is unchanged.
const FACETS = ['topic', 'author', 'series'] as const;
type Facet = (typeof FACETS)[number];
const FACET_LABELS: Record<Facet, string> = { topic: 'Topic', author: 'Author', series: 'Series' };
type SelectedFilters = Record<Facet, string[]>;
const emptyFilters = (): SelectedFilters => ({ topic: [], author: [], series: [] });

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

export default function SearchIsland() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    { url: string; title: string; excerpt: string; spanId?: string }[]
  >([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [filterFacets, setFilterFacets] = useState<Record<string, Record<string, number>> | null>(
    null,
  );
  const [filtersStatus, setFiltersStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  );
  const [selectedFilters, setSelectedFilters] = useState<SelectedFilters>(emptyFilters);
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

  const hasActiveFilters = FACETS.some((facet) => selectedFilters[facet].length > 0);

  function buildFilters(filters: SelectedFilters): PagefindSearchOptions['filters'] {
    const entries = FACETS.filter((facet) => filters[facet].length > 0).map((facet) => [
      facet,
      { any: filters[facet] },
    ]);
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  // A query under 2 characters only bails out when no filter is active - once
  // a filter is selected, an empty/short query is a legitimate "browse this
  // filter" request (pagefind.search(null, {filters}) supports exactly this).
  async function runSearch(value: string, filters: SelectedFilters) {
    const generation = ++requestGeneration.current;

    if (
      value.trim().length < 2 &&
      !filters.topic.length &&
      !filters.author.length &&
      !filters.series.length
    ) {
      setResults([]);
      setStatus('idle');
      return;
    }

    setStatus('loading');
    try {
      const pagefind = await loadPagefind();
      if (requestGeneration.current !== generation) return; // superseded while loading

      const search = await pagefind.search(value.trim().length >= 2 ? value : null, {
        filters: buildFilters(filters),
      });
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

  function handleChange(value: string) {
    setQuery(value);
    void runSearch(value, selectedFilters);
  }

  function toggleFilter(facet: Facet, value: string, checked: boolean) {
    const next: SelectedFilters = {
      ...selectedFilters,
      [facet]: checked
        ? [...selectedFilters[facet], value]
        : selectedFilters[facet].filter((v) => v !== value),
    };
    setSelectedFilters(next);
    void runSearch(query, next);
  }

  function clearFilters() {
    setSelectedFilters(emptyFilters());
    void runSearch(query, emptyFilters());
  }

  // Same lazy-load contract as the search input itself (docs/adr/0001: the
  // index only loads on the search page after explicit interaction) - opening
  // the filters panel is that interaction, same as a first keystroke.
  async function handleFiltersToggle(open: boolean) {
    if (!open || filterFacets || filtersStatus === 'loading') return;
    setFiltersStatus('loading');
    try {
      const pagefind = await loadPagefind();
      const facets = await pagefind.filters();
      setFilterFacets(facets);
      setFiltersStatus('ready');
    } catch {
      setFiltersStatus('error');
    }
  }

  return (
    <div className="search-island" data-hydrated={hydrated} aria-busy={status === 'loading'}>
      <label htmlFor="search-input" className="visually-hidden">
        Search Runtime Signals
      </label>
      <input
        id="search-input"
        type="search"
        value={query}
        placeholder="Search the archive…"
        onChange={(e) => handleChange(e.target.value)}
        className="search-island__input"
        autoComplete="off"
      />
      <details
        className="search-island__filters"
        onToggle={(e) => void handleFiltersToggle(e.currentTarget.open)}
      >
        <summary>
          Filters
          {hasActiveFilters && ` (${FACETS.reduce((n, f) => n + selectedFilters[f].length, 0)})`}
        </summary>
        {filtersStatus === 'loading' && (
          <p className="search-island__status" role="status" aria-live="polite">
            Loading filters…
          </p>
        )}
        {filtersStatus === 'error' && (
          <p className="search-island__status search-island__status--error">
            Filters are unavailable right now.
          </p>
        )}
        {filtersStatus === 'ready' &&
          filterFacets &&
          FACETS.filter((facet) => Object.keys(filterFacets[facet] ?? {}).length > 0).map(
            (facet) => (
              <fieldset key={facet} className="search-island__facet">
                <legend>{FACET_LABELS[facet]}</legend>
                {Object.entries(filterFacets[facet] ?? {})
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([value, count]) => (
                    <label key={value} className="search-island__facet-option">
                      <input
                        type="checkbox"
                        checked={selectedFilters[facet].includes(value)}
                        onChange={(e) => toggleFilter(facet, value, e.target.checked)}
                      />
                      {value} <span className="search-island__facet-count">({count})</span>
                    </label>
                  ))}
              </fieldset>
            ),
          )}
        {hasActiveFilters && (
          <button type="button" className="search-island__clear-filters" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </details>
      {status === 'loading' && (
        <p className="search-island__status" role="status" aria-live="polite">
          Loading search index…
        </p>
      )}
      {status === 'error' && (
        <p
          className="search-island__status search-island__status--error"
          role="status"
          aria-live="polite"
        >
          Search is unavailable right now. Browse <a href="/articles">all articles</a> or{' '}
          <a href="/topics">topics</a> instead.
        </p>
      )}
      {status === 'ready' && results.length === 0 && (
        <p className="search-island__status" role="status" aria-live="polite">
          {query.trim().length >= 2 ? (
            <>No results for &ldquo;{query}&rdquo;.</>
          ) : (
            'No results for the selected filters.'
          )}
        </p>
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
