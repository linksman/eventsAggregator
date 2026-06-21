Here’s the current exercise requirement summary:

## Backend service: API usage tracker

Build a small backend service that tracks API usage events per customer.

### Endpoint 1: ingest event

```http
POST /events
```

Receives one event:

```json
{
  "customerId": "cust_123",
  "endpoint": "/v1/search",
  "timestamp": "2026-06-21T10:15:30Z",
  "statusCode": 200,
  "latencyMs": 123
}
```

Expected behavior:

```text
- Validate required fields.
- Reject invalid input with 400.
- Count each accepted event once.
- statusCode >= 400 counts as an error.
- latencyMs must not be negative.
- endpoint is treated as an exact string.
```

---

### Endpoint 2: customer summary

```http
GET /customers/:customerId/summary
```

Returns:

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

Expected behavior:

```text
- Return aggregate stats for the requested customer.
- averageLatencyMs = totalLatencyMs / totalRequests.
- topEndpoints are sorted by count descending.
- For ties, sort alphabetically for deterministic output.
- Unknown customer: decide 404 or empty summary; good default is 404 unless interviewer prefers otherwise.
```

---

### Storage

For the minimal version:

```text
- Use in-memory storage.
- Do not store raw events.
- Store accumulated stats per customer.
```

Suggested internal shape:

```ts
type CustomerStats = {
  totalRequests: number;
  errorCount: number;
  totalLatencyMs: number;
  endpointCounts: Map<string, number>;
};
```

SQLite is optional, but not needed for the first version unless persistence or history is required.

---

### Assumptions

```text
- Few thousand events total during the test.
- Tens of events per second.
- Single-process local server is enough.
- No auth required.
- No deduplication unless an eventId is added.
- Timestamps are validated but do not affect the summary.
- Events may arrive out of order, but order does not matter.
```

---

### Implementation goal

```text
1. Minimal working backend first.
2. Clean, readable code.
3. Basic validation and error handling.
4. Easy to run locally.
5. Easy to explain.
6. Optional README or curl examples if time allows.
```

Production follow-up topics:

```text
- raw event storage
- time-window queries
- persistence
- deduplication
- concurrency
- scaling ingestion
- queues
- database choice
- observability
- metrics/logging/tracing
```
