import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from './app.js';
import { resetStore } from './store/store.js';
import {
  eventsIngestedTotal,
  eventsRejectedTotal,
  usageEventsErrorTotal,
  usageEventLatencyMs,
  customersTracked,
  resetMetrics,
} from './metrics.js';

const validEvent = {
  customerId: 'cust_1',
  endpoint: '/api/search',
  timestamp: '2026-06-21T10:00:00Z',
  statusCode: 200,
  latencyMs: 42,
};

beforeEach(() => {
  resetStore();
  resetMetrics();
});

describe('events_ingested_total', () => {
  it('increments on a valid event', async () => {
    await request(app).post('/events').send(validEvent);
    const { values } = await eventsIngestedTotal.get();
    expect(values[0].value).toBe(1);
  });

  it('does not increment on a rejected event', async () => {
    await request(app).post('/events').send({ ...validEvent, latencyMs: -1 });
    const { values } = await eventsIngestedTotal.get();
    expect(values[0].value).toBe(0);
  });
});

describe('events_rejected_total', () => {
  it('increments on a validation failure', async () => {
    await request(app).post('/events').send({ ...validEvent, latencyMs: -1 });
    const { values } = await eventsRejectedTotal.get();
    expect(values[0].value).toBe(1);
  });

  it('does not increment on a valid event', async () => {
    await request(app).post('/events').send(validEvent);
    const { values } = await eventsRejectedTotal.get();
    expect(values[0].value).toBe(0);
  });
});

describe('usage_events_error_total', () => {
  it('increments when payload statusCode >= 400', async () => {
    await request(app).post('/events').send({ ...validEvent, statusCode: 500 });
    const { values } = await usageEventsErrorTotal.get();
    expect(values[0].value).toBe(1);
  });

  it('does not increment for 2xx payload status', async () => {
    await request(app).post('/events').send(validEvent);
    const { values } = await usageEventsErrorTotal.get();
    expect(values[0].value).toBe(0);
  });

  it('counts boundary statusCode 400', async () => {
    await request(app).post('/events').send({ ...validEvent, statusCode: 400 });
    const { values } = await usageEventsErrorTotal.get();
    expect(values[0].value).toBe(1);
  });
});

describe('usage_event_latency_ms', () => {
  it('records sum equal to payload latencyMs', async () => {
    await request(app).post('/events').send({ ...validEvent, latencyMs: 42 });
    const { values } = await usageEventLatencyMs.get();
    const sum = values.find(v => v.metricName === 'usage_event_latency_ms_sum');
    expect(sum?.value).toBe(42);
  });

  it('accumulates sum across multiple events', async () => {
    await request(app).post('/events').send({ ...validEvent, latencyMs: 10 });
    await request(app).post('/events').send({ ...validEvent, latencyMs: 30 });
    const { values } = await usageEventLatencyMs.get();
    const sum = values.find(v => v.metricName === 'usage_event_latency_ms_sum');
    expect(sum?.value).toBe(40);
  });

  it('increments count per ingested event', async () => {
    await request(app).post('/events').send(validEvent);
    await request(app).post('/events').send(validEvent);
    const { values } = await usageEventLatencyMs.get();
    const count = values.find(v => v.metricName === 'usage_event_latency_ms_count');
    expect(count?.value).toBe(2);
  });

  it('does not record latency for rejected events', async () => {
    await request(app).post('/events').send({ ...validEvent, latencyMs: -1 });
    const { values } = await usageEventLatencyMs.get();
    const count = values.find(v => v.metricName === 'usage_event_latency_ms_count');
    expect(count?.value ?? 0).toBe(0);
  });
});

describe('customers_tracked', () => {
  it('increments for a new customer', async () => {
    await request(app).post('/events').send(validEvent);
    const { values } = await customersTracked.get();
    expect(values[0].value).toBe(1);
  });

  it('does not increment for a returning customer', async () => {
    await request(app).post('/events').send(validEvent);
    await request(app).post('/events').send(validEvent);
    const { values } = await customersTracked.get();
    expect(values[0].value).toBe(1);
  });

  it('tracks distinct customers independently', async () => {
    await request(app).post('/events').send(validEvent);
    await request(app).post('/events').send({ ...validEvent, customerId: 'cust_2' });
    const { values } = await customersTracked.get();
    expect(values[0].value).toBe(2);
  });
});

describe('GET /metrics', () => {
  it('returns 200 with Prometheus text content type', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
  });

  it('exposes all 5 metric names', async () => {
    const res = await request(app).get('/metrics');
    expect(res.text).toMatch(/events_ingested_total/);
    expect(res.text).toMatch(/events_rejected_total/);
    expect(res.text).toMatch(/usage_events_error_total/);
    expect(res.text).toMatch(/usage_event_latency_ms/);
    expect(res.text).toMatch(/customers_tracked/);
  });

  it('reflects live counter values in the response body', async () => {
    await request(app).post('/events').send(validEvent);
    const res = await request(app).get('/metrics');
    expect(res.text).toMatch(/events_ingested_total 1/);
  });
});
