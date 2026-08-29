// Local-only OpenTelemetry setup for build and CI boundary instrumentation.
// This module deliberately configures a ConsoleSpanExporter directly instead
// of reading exporter environment variables or contacting a telemetry
// backend - no OTel account or collector exists for this project (same
// dry-run posture as .github/workflows/deploy.yml's `wrangler deploy
// --dry-run` and src/lib/analytics.ts's inert send() stub). Swapping in a
// real backend later means replacing ConsoleSpanExporter with an OTLP
// exporter here - additive, not a redesign.
//
// Never merged with src/lib/analytics.ts's interaction-event contract or
// with Langfuse - see docs/adr/0003-analytics-platform.md's explicit "Do not
// merge any of these with OpenTelemetry or Langfuse."
import { execFileSync } from 'node:child_process';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import {
  ConsoleSpanExporter,
  NodeTracerProvider,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node';

// SimpleSpanProcessor's constructor takes the exporter as a positional
// argument, not `{ exporter }` - passing an options object here silently
// produces a processor with no real exporter, which fails during
// forceFlush() with an unhelpful error and never prints a span. Confirmed by
// reproducing directly against the real, correctly-installed
// @opentelemetry/sdk-trace-node@2.10.0 before writing this comment.
const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())],
});
provider.register();

const tracer = trace.getTracer('runtime-signals.infrastructure', '1.0.0');

/** Return the current CI commit or the checked-out repository commit locally. */
export function getCommitSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return (
      execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim() || 'unknown'
    );
  } catch {
    return 'unknown';
  }
}

async function flush() {
  try {
    await provider.forceFlush();
  } catch (error) {
    // Telemetry must never make a build or publication decision fail. The
    // exporter is local-only, so this is safe to surface without retrying.
    console.error(`OpenTelemetry flush failed: ${error?.message ?? error}`);
  }
}

/** Run an operation inside a span and mark the span from its outcome. */
export async function withSpan(name, attributes, operation) {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    const startedAt = process.hrtime.bigint();
    try {
      const result = await operation(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      const errorType = error?.name ?? typeof error;
      span.setAttribute('error.type', errorType);
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorType });
      throw error;
    } finally {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      span.setAttribute('runtime.duration_ms', Number(durationMs.toFixed(3)));
      span.end();
      await flush();
    }
  });
}
