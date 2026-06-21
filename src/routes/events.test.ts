import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { resetStore, getSummary } from '../store/store.js';

const validPayload = {
  customerId: 'cust_123',
  endpoint: '/v1/search',
  timestamp: '2026-06-21T10:15:30Z',
  statusCode: 200,
  latencyMs: 123,
};

beforeEach(() => {
  resetStore();
});

describe('POST /events', () => {
  it('returns 201 for a valid payload', async () => {
    const res = await request(app).post('/events').send(validPayload);
    expect(res.status).toBe(201);
  });

  it('returns 400 when customerId is missing', async () => {
    const { customerId: _, ...rest } = validPayload;
    const res = await request(app).post('/events').send(rest);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when endpoint is missing', async () => {
    const { endpoint: _, ...rest } = validPayload;
    const res = await request(app).post('/events').send(rest);
    expect(res.status).toBe(400);
  });

  it('returns 400 when timestamp is missing', async () => {
    const { timestamp: _, ...rest } = validPayload;
    const res = await request(app).post('/events').send(rest);
    expect(res.status).toBe(400);
  });

  it('returns 400 when statusCode is missing', async () => {
    const { statusCode: _, ...rest } = validPayload;
    const res = await request(app).post('/events').send(rest);
    expect(res.status).toBe(400);
  });

  it('returns 400 when latencyMs is missing', async () => {
    const { latencyMs: _, ...rest } = validPayload;
    const res = await request(app).post('/events').send(rest);
    expect(res.status).toBe(400);
  });

  it('returns 400 when latencyMs is negative', async () => {
    const res = await request(app).post('/events').send({ ...validPayload, latencyMs: -1 });
    expect(res.status).toBe(400);
  });

  it('returns 400 when timestamp is not ISO 8601', async () => {
    const res = await request(app).post('/events').send({ ...validPayload, timestamp: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  it('reflects a successful event in the store', async () => {
    await request(app).post('/events').send(validPayload);
    const summary = getSummary('cust_123');
    expect(summary?.totalRequests).toBe(1);
    expect(summary?.averageLatencyMs).toBe(123);
  });
});
