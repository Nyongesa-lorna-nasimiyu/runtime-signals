/**
 * The bounded interaction-event contract from docs/adr/0003-analytics-platform.md
 * (see the 2026-08-29 amendment). Every event name and every property here is
 * exactly what that ADR specifies - a new event name or an arbitrary-string
 * property must not be added without updating the ADR first. Never merged
 * with OpenTelemetry or Langfuse (same ADR) - this module has no dependency
 * on, and is never imported by, scripts/lib/otel.mjs or anything under
 * scripts/ci/.
 *
 * Properties are allow-listed slugs/topics/counts only - never a search
 * query, an email address, an IP, a user agent, or any other free-form or
 * identifying value. `engaged_read` in particular carries no identity and is
 * sampled (see ENGAGED_READ_SAMPLE_RATE below).
 */
export type AnalyticsEvent =
  | { name: 'article_view'; properties: { slug: string; topics: string[] } }
  | { name: 'engaged_read'; properties: { slug: string } }
  | { name: 'search_submit'; properties: { resultCount: number } }
  | { name: 'artifact_open'; properties: { artifactId: string } }
  | { name: 'newsletter_cta'; properties: Record<string, never> }
  | { name: 'business_cta'; properties: { ctaId: string } };

/** Fired on every track() call, in every build (not just dev) - a harmless,
 * production-safe observation hook with no network or console effect of its
 * own. Exists so real event-firing can be verified by a real test (e.g.
 * Playwright listening for this event on a real built page) without
 * depending on dev-only console output, which a production-mode build never
 * produces. Carries the same event shape a real provider would eventually
 * receive - nothing additional, nothing identifying. */
const OBSERVABLE_EVENT_NAME = 'runtimesignals:analytics';

/**
 * The only function that changes once a real provider is account-verified
 * and wired in (Cloudflare Web Analytics, or Plausible/Umami per the ADR's
 * Phase-2 candidates) - e.g. swap the body for
 * `navigator.sendBeacon(providerUrl, JSON.stringify(event))`. Until then this
 * is intentionally inert: no analytics account or script has been activated
 * for this project (ADR-0003's amendment), so nothing here has any network
 * effect.
 */
function send(event: AnalyticsEvent): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OBSERVABLE_EVENT_NAME, { detail: event }));
  }
  if (import.meta.env.DEV) {
    console.debug('[analytics:dev-only, not sent anywhere]', event.name, event.properties);
  }
}

/**
 * Never blocks rendering or hydration (ADR-0003: "analytics failure never
 * blocks rendering") - dispatched off the main task via requestIdleCallback
 * where available, and any error from `send` is swallowed rather than
 * propagated.
 */
export function track(event: AnalyticsEvent): void {
  try {
    const dispatch = () => {
      try {
        send(event);
      } catch {
        // Deliberately silent - see the function doc above.
      }
    };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(dispatch);
    } else {
      queueMicrotask(dispatch);
    }
  } catch {
    // requestIdleCallback/queueMicrotask itself throwing is not a real-world
    // case in any supported browser, but track() must never throw regardless.
  }
}

// "Sampled, without an identity" (ADR-0003) - a fraction of qualifying reads
// count toward engaged_read, chosen per-pageview via Math.random(), not tied
// to any persisted or derivable identity, so it cannot be used to
// reconstruct a specific reader's behavior across visits.
export const ENGAGED_READ_SAMPLE_RATE = 0.5;
// "Time-plus-depth threshold" (ADR-0003): both must be satisfied, not either
// alone - a reader who opens a tab and walks away for 20s without scrolling
// isn't engaged, and a reader who scrolls straight to the bottom in 1s
// (skimming, or a script) isn't either.
export const ENGAGED_READ_MIN_MS = 15_000;
export const ENGAGED_READ_MIN_DEPTH = 0.5;

/**
 * Wires up engaged_read for one article page: starts a timer on call, and
 * once both the time and scroll-depth thresholds are independently
 * satisfied, fires the event exactly once (IntersectionObserver naturally
 * stops contributing once disconnected - no further work needed to guarantee
 * "once"). No-ops immediately for the (1 - ENGAGED_READ_SAMPLE_RATE) of
 * pageviews not sampled in, so unsampled visits pay no IntersectionObserver
 * cost at all.
 */
export function initEngagedRead(slug: string): void {
  if (typeof document === 'undefined' || typeof IntersectionObserver === 'undefined') return;
  if (Math.random() > ENGAGED_READ_SAMPLE_RATE) return;

  const startedAt = Date.now();
  let deepEnough = false;
  let fired = false;

  const body = document.querySelector('.article__body');
  if (!body) return;

  const maybeFire = () => {
    if (fired) return;
    if (!deepEnough) return;
    if (Date.now() - startedAt < ENGAGED_READ_MIN_MS) return;
    fired = true;
    track({ name: 'engaged_read', properties: { slug } });
    observer.disconnect();
  };

  // A rough scroll-depth proxy: has the reader scrolled far enough that the
  // body's bottom edge has entered the viewport at all. Coarser than a
  // percentage-of-scroll calculation, but sufficient for a sampled,
  // non-identity signal - see ADR-0003's own skepticism of precise
  // "completion" metrics.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) deepEnough = true;
      }
      maybeFire();
    },
    { threshold: ENGAGED_READ_MIN_DEPTH },
  );
  observer.observe(body);

  const timer = setTimeout(maybeFire, ENGAGED_READ_MIN_MS);
  window.addEventListener(
    'pagehide',
    () => {
      clearTimeout(timer);
      observer.disconnect();
    },
    { once: true },
  );
}
