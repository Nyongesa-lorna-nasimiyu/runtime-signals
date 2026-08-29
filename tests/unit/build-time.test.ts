import { describe, it, expect, afterEach, vi } from 'vitest';

// BUILD_TIME is a module-level constant computed once at import time, so
// exercising both branches of its SOURCE_DATE_EPOCH check requires resetting
// the module registry and re-importing between assertions.
describe('BUILD_TIME', () => {
  const originalEnv = process.env.SOURCE_DATE_EPOCH;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.SOURCE_DATE_EPOCH;
    else process.env.SOURCE_DATE_EPOCH = originalEnv;
    vi.resetModules();
  });

  it('defaults to the real current time when SOURCE_DATE_EPOCH is unset', async () => {
    delete process.env.SOURCE_DATE_EPOCH;
    vi.resetModules();
    const before = Date.now();
    const { BUILD_TIME } = await import('@/lib/build-time');
    const after = Date.now();
    expect(BUILD_TIME.getTime()).toBeGreaterThanOrEqual(before);
    expect(BUILD_TIME.getTime()).toBeLessThanOrEqual(after);
  });

  it('pins to SOURCE_DATE_EPOCH when set, for reproducible builds', async () => {
    process.env.SOURCE_DATE_EPOCH = '1700000000';
    vi.resetModules();
    const { BUILD_TIME } = await import('@/lib/build-time');
    expect(BUILD_TIME.toISOString()).toBe('2023-11-14T22:13:20.000Z');
  });
});
