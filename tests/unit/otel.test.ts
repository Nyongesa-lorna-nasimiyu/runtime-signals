import { describe, expect, it, vi } from 'vitest';
import { withSpan } from '../../scripts/lib/otel.mjs';

describe('withSpan', () => {
  it('exports a successful local span with bounded attributes and duration', async () => {
    const output = vi.spyOn(console, 'dir').mockImplementation(() => {});

    await withSpan(
      'test.success',
      { 'test.kind': 'unit' },
      async (span: { setAttribute: (key: string, value: string) => void }) => {
        span.setAttribute('test.result', 'success');
      },
    );

    const [firstCall] = output.mock.calls;
    expect(firstCall).toBeDefined();
    const exportedSpan = firstCall![0] as {
      name: string;
      attributes: Record<string, unknown>;
      status: { code: number };
    };
    expect(exportedSpan.name).toBe('test.success');
    expect(exportedSpan.attributes).toMatchObject({
      'test.kind': 'unit',
      'test.result': 'success',
    });
    expect(exportedSpan.attributes['runtime.duration_ms']).toEqual(expect.any(Number));
    expect(exportedSpan.status.code).toBe(1);
    output.mockRestore();
  });

  it('exports an error span and preserves the operation error', async () => {
    const output = vi.spyOn(console, 'dir').mockImplementation(() => {});

    await expect(
      withSpan('test.failure', {}, async () => {
        throw new Error('expected test failure');
      }),
    ).rejects.toThrow('expected test failure');

    const [firstCall] = output.mock.calls;
    expect(firstCall).toBeDefined();
    const exportedSpan = firstCall![0] as {
      name: string;
      attributes: Record<string, unknown>;
      status: { code: number; message: string };
    };
    expect(exportedSpan.name).toBe('test.failure');
    expect(exportedSpan.attributes['error.type']).toBe('Error');
    expect(exportedSpan.status.code).toBe(2);
    expect(exportedSpan.status.message).toBe('Error');
    output.mockRestore();
  });
});
