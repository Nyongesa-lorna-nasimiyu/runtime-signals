import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

// Build-time only (this module never ships to the browser — Astro endpoint
// files run in Node during the build). Satori needs TTF/OTF/WOFF; it does not
// support WOFF2, so this uses a separate TTF copy of the same JetBrains Mono
// family the site self-hosts as WOFF2 for the browser
// (public/fonts/jetbrains-mono-variable.woff2) — same typeface, different
// build-time-only binary, for a build-time-only tool.
//
// Resolved from process.cwd(), not import.meta.url: Astro relocates this
// module's compiled output into dist/.prerender/chunks/ during prerendering,
// so a path built relative to the module's own location breaks (a real build
// failure, not a theoretical one — ENOENT on the first real build). The
// project root is stable regardless of where the bundler puts the chunk.
const fontsDir = join(process.cwd(), 'scripts/og-fonts');
const regular = readFileSync(join(fontsDir, 'JetBrainsMono-Regular.ttf'));
const bold = readFileSync(join(fontsDir, 'JetBrainsMono-Bold.ttf'));

// The light palette only, spelled out — an OG image is a static raster served
// to link-preview crawlers and chat apps, not a page with a live
// prefers-color-scheme; light-dark() has no meaning here.
const PALETTE = {
  paper: '#f7f8fa',
  ink: '#12161c',
  inkMuted: '#4b5563',
  signal: '#2354c9',
  hairline: '#d8dee7',
};

const WIDTH = 1200;
const HEIGHT = 630;

// A row of uneven bars stands in for the site's signal-trace motif
// (src/components/SignalTrace.astro) — satori's layout engine is a
// constrained flexbox subset with no arbitrary SVG path children, so the
// polyline itself can't be reused directly; this reproduces the same visual
// idea (an irregular pulse/step trace) within what satori can actually lay out.
function signalBars(seed: number) {
  let state = seed || 1;
  const next = () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
  const bars = Array.from({ length: 28 }, () => 6 + Math.round(next() * 34));
  return {
    type: 'div',
    props: {
      style: { display: 'flex', alignItems: 'flex-end', gap: '6px', height: '40px' },
      children: bars.map((h) => ({
        type: 'div',
        props: {
          style: { width: '10px', height: `${h}px`, background: PALETTE.signal, opacity: 0.55 },
        },
      })),
    },
  };
}

interface OgImageInput {
  eyebrow: string;
  title: string;
  seed?: number;
}

// A 1x1 transparent PNG, for SKIP_OG_RENDER builds only — see below.
const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

export async function renderOgImage({ eyebrow, title, seed = 1 }: OgImageInput): Promise<Buffer> {
  // Escape hatch for scripts/measure-build-at-scale.mjs only — never set in a
  // real build (prebuild/CI never set this env var). Real OG generation
  // (Satori font-shaping + resvg PNG encode, per document, sequential in
  // Astro's static path generation) turned out to dominate build time at
  // scale badly enough to need isolating from the Pagefind/content-build
  // measurement that scale test actually cares about — see
  // docs/poc/README.md's fixture-scaling results for the real numbers this
  // produced (build time went 54s -> 578s from 100 to 1,000 documents, ~11x
  // for a 10x document increase, while Pagefind itself scaled roughly
  // linearly) and why OG-at-scale is now tracked as its own open item rather
  // than silently accepted or silently fixed.
  if (process.env.SKIP_OG_RENDER === 'true') return PLACEHOLDER_PNG;

  const tree = {
    type: 'div',
    props: {
      style: {
        width: `${WIDTH}px`,
        height: `${HEIGHT}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px',
        background: PALETTE.paper,
        fontFamily: 'JetBrains Mono',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', gap: '14px' },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    background: PALETTE.ink,
                    color: PALETTE.paper,
                    fontWeight: 700,
                    fontSize: '22px',
                    padding: '6px 10px',
                    borderRadius: '3px',
                    letterSpacing: '1px',
                  },
                  children: 'RS',
                },
              },
              {
                type: 'div',
                props: {
                  style: { display: 'flex', fontSize: '26px', fontWeight: 700, color: PALETTE.ink },
                  children: 'Runtime Signals',
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', gap: '20px' },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: '22px',
                    color: PALETTE.inkMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                  },
                  children: eyebrow,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: '56px',
                    fontWeight: 700,
                    lineHeight: 1.15,
                    color: PALETTE.ink,
                    letterSpacing: '-1px',
                  },
                  children: title,
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', gap: '16px' },
            children: [
              signalBars(seed),
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: `1px solid ${PALETTE.hairline}`,
                    paddingTop: '16px',
                    fontSize: '18px',
                    color: PALETTE.inkMuted,
                  },
                  children: [
                    {
                      type: 'div',
                      props: { style: { display: 'flex' }, children: 'runtimesignals.tech' },
                    },
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex' },
                        children: 'Failure mechanism -> invariant -> engineering practice',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };

  const svg = await satori(tree as never, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'JetBrains Mono', data: regular, weight: 400, style: 'normal' },
      { name: 'JetBrains Mono', data: bold, weight: 700, style: 'normal' },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } });
  return resvg.render().asPng();
}
