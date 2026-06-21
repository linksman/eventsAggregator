# API Usage Tracker — Specification

## Overview

A small backend service that tracks API usage events per customer.

---

## Endpoints

### POST /events

Ingests a single usage event.

**Request body:**

```json
{
  "customerId": "cust_123",
  "endpoint": "/v1/search",
  "timestamp": "2026-06-21T10:15:30Z",
  "statusCode": 200,
  "latencyMs": 123
}
```

**Validation rules:**

- All fields are required.
- Reject invalid input with `400`.
- `statusCode >= 400` counts as an error.
- `latencyMs` must not be negative.
- `endpoint` is treated as an exact string.
- Each accepted event is counted exactly once.
- `timestamp` is validated but does not affect the summary.

---

### GET /customers/:customerId/summary

Returns aggregate stats for the requested customer.

**Response body:**

```json
{
  "customerId": "cust_123",
  "totalRequests": 120,
  "errorCount": 5,
  "averageLatencyMs": 98.4,
  "topEndpoints": [
    { "endpoint": "/v1/search", "count": 70 },
    { "endpoint": "/v1/users", "count": 50 }
  ]
}
```

**Behavior:**

- `averageLatencyMs = totalLatencyMs / totalRequests`
- `topEndpoints` sorted by count descending; ties broken alphabetically for deterministic output.
- Unknown customer returns `404`.

---

## Storage

- In-memory only (no persistence required for v1).
- Do not store raw events — store accumulated stats per customer.

**Internal shape:**

```ts
type CustomerStats = {
  totalRequests: number;
  errorCount: number;
  totalLatencyMs: number;
  endpointCounts: Map<string, number>;
};
```

SQLite is optional and not needed unless persistence or history is required.

---

## Assumptions

- Few thousand events total during the test.
- Tens of events per second.
- Single-process local server is sufficient.
- No auth required.
- No deduplication unless an `eventId` field is added.
- Events may arrive out of order; order does not affect the summary.

---

## Implementation Goals

1. Minimal working backend first.
2. Clean, readable code.
3. Basic validation and error handling.
4. Easy to run locally.
5. Easy to explain.
6. Optional README or curl examples if time allows.

---

## Production Follow-up Topics

- Raw event storage
- Time-window queries
- Persistence
- Deduplication
- Concurrency
- Scaling ingestion
- Queues
- Database choice
- Observability (metrics, logging, tracing)
