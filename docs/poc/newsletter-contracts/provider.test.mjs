import test from 'node:test';
import assert from 'node:assert/strict';
import { MockProvider } from './provider.mjs';

test('subscription is pending and duplicate-safe', () => {
  const provider = new MockProvider();
  assert.deepEqual(provider.subscribe('Reader@example.com'), { status: 'created', state: 'pending' });
  assert.deepEqual(provider.subscribe('reader@example.com'), { status: 'duplicate', state: 'pending' });
});

test('webhooks are idempotent and state changes are explicit', () => {
  const provider = new MockProvider();
  provider.subscribe('reader@example.com');
  assert.equal(provider.webhook({ id: 'e1', type: 'confirmed', email: 'reader@example.com' }), 'applied');
  assert.equal(provider.webhook({ id: 'e1', type: 'confirmed', email: 'reader@example.com' }), 'duplicate');
  assert.equal(provider.subscribers.get('reader@example.com').state, 'active');
  assert.equal(provider.webhook({ id: 'e2', type: 'complained', email: 'reader@example.com' }), 'applied');
  assert.equal(provider.subscribers.get('reader@example.com').state, 'complained');
});

test('webhook signatures reject tampering', () => {
  const provider = new MockProvider('test-secret');
  const body = JSON.stringify({ id: 'e1', type: 'confirmed' });
  assert.equal(provider.verify(body, provider.sign(body)), true);
  assert.equal(provider.verify(body + 'x', provider.sign(body)), false);
});
