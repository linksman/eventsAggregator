import { describe, it, expect } from 'vitest';
import { validateEvent } from './schemas.js';

const validPayload = {
  customerId: 'cust_123',
  endpoint: '/v1/search',
  timestamp: '2026-06-21T10:15:30Z',
  statusCode: 200,
  latencyMs: 123,
};

describe('validateEvent', () => {
  it('accepts a valid payload and returns a typed object', () => {
    const result = validateEvent(validPayload);
    expect(result).toEqual(validPayload);
  });

  it('throws when customerId is missing', () => {
    const { customerId: _, ...rest } = validPayload;
    expect(() => validateEvent(rest)).toThrow();
  });

  it('throws when endpoint is missing', () => {
    const { endpoint: _, ...rest } = validPayload;
    expect(() => validateEvent(rest)).toThrow();
  });

  it('throws when timestamp is missing', () => {
    const { timestamp: _, ...rest } = validPayload;
    expect(() => validateEvent(rest)).toThrow();
  });

  it('throws when statusCode is missing', () => {
    const { statusCode: _, ...rest } = validPayload;
    expect(() => validateEvent(rest)).toThrow();
  });

  it('throws when latencyMs is missing', () => {
    const { latencyMs: _, ...rest } = validPayload;
    expect(() => validateEvent(rest)).toThrow();
  });

  it('throws when latencyMs is negative', () => {
    expect(() => validateEvent({ ...validPayload, latencyMs: -1 })).toThrow();
  });

  it('accepts latencyMs of 0', () => {
    expect(() => validateEvent({ ...validPayload, latencyMs: 0 })).not.toThrow();
  });

  it('throws when statusCode is a float', () => {
    expect(() => validateEvent({ ...validPayload, statusCode: 200.5 })).toThrow();
  });

  it('accepts statusCode as an integer', () => {
    expect(() => validateEvent({ ...validPayload, statusCode: 404 })).not.toThrow();
  });

  it('throws when timestamp is not ISO 8601', () => {
    expect(() => validateEvent({ ...validPayload, timestamp: 'not-a-date' })).toThrow();
  });

  it('strips unknown fields from the result', () => {
    const result = validateEvent({ ...validPayload, extra: 'field' });
    expect(result).not.toHaveProperty('extra');
  });
});
