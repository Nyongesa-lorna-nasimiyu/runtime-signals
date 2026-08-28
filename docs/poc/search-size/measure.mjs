import { gzipSync } from 'node:zlib';

const sizes = [100, 1000, 5000];
for (const count of sizes) {
  const documents = Array.from({ length: count }, (_, i) => ({
    url: `/articles/reliability-invariant-${i}`,
    title: `Reliability invariant ${i}`,
    summary: 'A systems problem, its failure mechanism, and an implementable practice.',
    body: 'idempotency leases fencing tokens observability evaluation recovery orchestration '.repeat(8),
    topic: i % 2 ? 'reliability' : 'observability',
    series: i % 3 ? 'agent-reliability-patterns' : 'production-agents',
    author: 'runtime-signals',
    date: '2026-08-28',
  }));
  const bytes = Buffer.byteLength(JSON.stringify(documents));
  const compressed = gzipSync(JSON.stringify(documents)).byteLength;
  console.log(JSON.stringify({ documents: count, raw_bytes: bytes, gzip_bytes: compressed }));
}
