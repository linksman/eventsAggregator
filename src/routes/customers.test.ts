import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { resetStore } from '../store/store.js';

const baseEvent = {
  customerId: 'cust_123',
  endpoint: '/v1/search',
  timestamp: '2026-06-21T10:15:30Z',
  statusCode: 200,
  latencyMs: 100,
};

beforeEach(() => {
  resetStore();
});

describe('GET /customers/:customerId/summary', () => {
  it('returns 404 for an unknown customer', async () => {
    const res = await request(app).get('/customers/unknown/summary');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 200 with correct shape for a known customer', async () => {
    await request(app).post('/events').send(baseEvent);
    const res = await request(app).get('/customers/cust_123/summary');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      customerId: 'cust_123',
      totalRequests: 1,
      errorCount: 0,
      averageLatencyMs: 100,
      topEndpoints: [{ endpoint: '/v1/search', count: 1 }],
    });
  });

  it('totalRequests matches the number of ingested events', async () => {
    await request(app).post('/events').send(baseEvent);
    await request(app).post('/events').send(baseEvent);
    await request(app).post('/events').send(baseEvent);
    const res = await request(app).get('/customers/cust_123/summary');
    expect(res.body.totalRequests).toBe(3);
  });

  it('errorCount reflects events with statusCode >= 400', async () => {
    await request(app).post('/events').send({ ...baseEvent, statusCode: 200 });
    await request(app).post('/events').send({ ...baseEvent, statusCode: 400 });
    await request(app).post('/events').send({ ...baseEvent, statusCode: 500 });
    const res = await request(app).get('/customers/cust_123/summary');
    expect(res.body.errorCount).toBe(2);
  });

  it('averageLatencyMs is computed correctly', async () => {
    await request(app).post('/events').send({ ...baseEvent, latencyMs: 100 });
    await request(app).post('/events').send({ ...baseEvent, latencyMs: 200 });
    const res = await request(app).get('/customers/cust_123/summary');
    expect(res.body.averageLatencyMs).toBe(150);
  });

  it('topEndpoints is sorted descending by count', async () => {
    await request(app).post('/events').send({ ...baseEvent, endpoint: '/v1/search' });
    await request(app).post('/events').send({ ...baseEvent, endpoint: '/v1/search' });
    await request(app).post('/events').send({ ...baseEvent, endpoint: '/v1/users' });
    const res = await request(app).get('/customers/cust_123/summary');
    expect(res.body.topEndpoints[0]).toEqual({ endpoint: '/v1/search', count: 2 });
    expect(res.body.topEndpoints[1]).toEqual({ endpoint: '/v1/users', count: 1 });
  });

  it('topEndpoints breaks ties alphabetically', async () => {
    await request(app).post('/events').send({ ...baseEvent, endpoint: '/v1/zebra' });
    await request(app).post('/events').send({ ...baseEvent, endpoint: '/v1/apple' });
    const res = await request(app).get('/customers/cust_123/summary');
    expect(res.body.topEndpoints[0].endpoint).toBe('/v1/apple');
    expect(res.body.topEndpoints[1].endpoint).toBe('/v1/zebra');
  });

  it('summary reflects events from multiple POST /events calls in sequence', async () => {
    await request(app).post('/events').send({ ...baseEvent, endpoint: '/v1/a', latencyMs: 50 });
    await request(app).post('/events').send({ ...baseEvent, endpoint: '/v1/b', latencyMs: 150, statusCode: 500 });
    const res = await request(app).get('/customers/cust_123/summary');
    expect(res.body.totalRequests).toBe(2);
    expect(res.body.errorCount).toBe(1);
    expect(res.body.averageLatencyMs).toBe(100);
    expect(res.body.topEndpoints).toHaveLength(2);
  });
});
