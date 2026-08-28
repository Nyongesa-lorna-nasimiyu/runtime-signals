import { createHmac, timingSafeEqual } from 'node:crypto';

export class MockProvider {
  constructor(secret = 'poc-secret') {
    this.secret = secret;
    this.subscribers = new Map();
    this.events = new Set();
  }

  subscribe(email) {
    const key = email.trim().toLowerCase();
    const previous = this.subscribers.get(key);
    if (previous) return { status: 'duplicate', state: previous.state };
    this.subscribers.set(key, { state: 'pending' });
    return { status: 'created', state: 'pending' };
  }

  webhook(event) {
    if (this.events.has(event.id)) return 'duplicate';
    this.events.add(event.id);
    const current = this.subscribers.get(event.email);
    if (!current) return 'ignored-unknown';
    if (event.type === 'confirmed') current.state = 'active';
    if (event.type === 'unsubscribed' || event.type === 'bounced' || event.type === 'complained') current.state = event.type;
    return 'applied';
  }

  sign(body) {
    return createHmac('sha256', this.secret).update(body).digest('hex');
  }

  verify(body, signature) {
    const expected = Buffer.from(this.sign(body));
    const actual = Buffer.from(signature ?? '');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
