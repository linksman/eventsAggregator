import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import app, { errorHandler } from './app.js';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('security middleware', () => {
  it('sets X-Content-Type-Options header via helmet', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns 413 when body exceeds size limit', async () => {
    const largeBody = { customerId: 'x'.repeat(200 * 1024) };
    const res = await request(app).post('/events').send(largeBody);
    expect(res.status).toBe(413);
  });
});

describe('error handler', () => {
  it('returns 500 with standard error shape for unhandled errors', async () => {
    const testApp = express();
    testApp.get('/test-error', () => { throw new Error('boom'); });
    testApp.use(errorHandler);
    const res = await request(testApp).get('/test-error');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
