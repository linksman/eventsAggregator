import { describe, it, expect, beforeEach } from 'vitest';
import { recordEvent, getSummary, resetStore } from './store.js';

const baseEvent = {
  customerId: 'cust_1',
  endpoint: '/v1/search',
  timestamp: '2026-06-21T10:00:00Z',
  statusCode: 200,
  latencyMs: 100,
};

beforeEach(() => {
  resetStore();
});

describe('recordEvent', () => {
  it('creates a new entry for an unknown customer', () => {
    recordEvent(baseEvent);
    expect(getSummary('cust_1')).not.toBeNull();
  });

  it('increments totalRequests with each event', () => {
    recordEvent(baseEvent);
    recordEvent(baseEvent);
    expect(getSummary('cust_1')?.totalRequests).toBe(2);
  });

  it('increments errorCount when statusCode >= 400', () => {
    recordEvent({ ...baseEvent, statusCode: 400 });
    recordEvent({ ...baseEvent, statusCode: 500 });
    expect(getSummary('cust_1')?.errorCount).toBe(2);
  });

  it('does not increment errorCount when statusCode < 400', () => {
    recordEvent({ ...baseEvent, statusCode: 200 });
    recordEvent({ ...baseEvent, statusCode: 304 });
    expect(getSummary('cust_1')?.errorCount).toBe(0);
  });

  it('accumulates totalLatencyMs across events', () => {
    recordEvent({ ...baseEvent, latencyMs: 100 });
    recordEvent({ ...baseEvent, latencyMs: 200 });
    // averageLatencyMs = 300 / 2
    expect(getSummary('cust_1')?.averageLatencyMs).toBe(150);
  });

  it('tracks endpoint counts independently', () => {
    recordEvent({ ...baseEvent, endpoint: '/v1/search' });
    recordEvent({ ...baseEvent, endpoint: '/v1/search' });
    recordEvent({ ...baseEvent, endpoint: '/v1/users' });
    const top = getSummary('cust_1')?.topEndpoints ?? [];
    expect(top[0]).toEqual({ endpoint: '/v1/search', count: 2 });
    expect(top[1]).toEqual({ endpoint: '/v1/users', count: 1 });
  });

  it('records latencyMs of 0 correctly', () => {
    recordEvent({ ...baseEvent, latencyMs: 0 });
    expect(getSummary('cust_1')?.averageLatencyMs).toBe(0);
  });
});

describe('getSummary', () => {
  it('returns null for an unknown customer', () => {
    expect(getSummary('unknown')).toBeNull();
  });

  it('averageLatencyMs equals the single event latency for one event', () => {
    recordEvent({ ...baseEvent, latencyMs: 123 });
    expect(getSummary('cust_1')?.averageLatencyMs).toBe(123);
  });

  it('sorts topEndpoints descending by count', () => {
    recordEvent({ ...baseEvent, endpoint: '/v1/a' });
    recordEvent({ ...baseEvent, endpoint: '/v1/b' });
    recordEvent({ ...baseEvent, endpoint: '/v1/b' });
    const top = getSummary('cust_1')?.topEndpoints ?? [];
    expect(top[0].endpoint).toBe('/v1/b');
    expect(top[1].endpoint).toBe('/v1/a');
  });

  it('breaks ties in topEndpoints alphabetically', () => {
    recordEvent({ ...baseEvent, endpoint: '/v1/zebra' });
    recordEvent({ ...baseEvent, endpoint: '/v1/apple' });
    const top = getSummary('cust_1')?.topEndpoints ?? [];
    expect(top[0].endpoint).toBe('/v1/apple');
    expect(top[1].endpoint).toBe('/v1/zebra');
  });

  it('isolates state between customers', () => {
    recordEvent({ ...baseEvent, customerId: 'cust_1' });
    recordEvent({ ...baseEvent, customerId: 'cust_2', latencyMs: 50 });
    expect(getSummary('cust_1')?.totalRequests).toBe(1);
    expect(getSummary('cust_2')?.averageLatencyMs).toBe(50);
  });
});

describe('resetStore', () => {
  it('clears all customer data', () => {
    recordEvent(baseEvent);
    resetStore();
    expect(getSummary('cust_1')).toBeNull();
  });
});
