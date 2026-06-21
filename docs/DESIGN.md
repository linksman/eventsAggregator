# API Usage Tracker — Design

## Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **Storage:** In-memory (plain JS object / Map)
- **Validation:** Zod

---

## Project Structure

```
src/
  app.ts          # Express app setup, middleware, route mounting
  server.ts       # HTTP server entry point (binds port, starts listening)
  routes/
    events.ts     # POST /events
    customers.ts  # GET /customers/:customerId/summary
  store/
    store.ts      # In-memory store and all mutation/query operations
  validation/
    schemas.ts    # Zod schemas for request bodies
```

---

## Data Model

A single `Map<string, CustomerStats>` keyed by `customerId` holds all state. No raw events are retained.

```
CustomerStats {
  totalRequests:   number
  errorCount:      number
  totalLatencyMs:  number
  endpointCounts:  Map<string, number>
}
```

The store is a module-level singleton. Because the service is single-process and single-threaded (Node.js event loop), no locking is needed for v1.

---

## Layer Responsibilities

### Routes

Thin handlers. Responsible only for:
- Parsing the request
- Calling the validation layer
- Calling the store
- Sending the HTTP response

No business logic lives here.

### Validation (`schemas.ts`)

Zod schemas define the shape and constraints for `POST /events`:
- All five fields present and of the correct type
- `timestamp` is a valid ISO 8601 datetime string
- `latencyMs` is a non-negative number
- `statusCode` is an integer

A single `validate` call either returns a typed object or throws, which the route catches and maps to a `400` response with a descriptive error message.

### Store (`store.ts`)

All reads and writes go through the store module. It exposes two operations:

**`recordEvent(event)`**
Looks up (or initializes) the `CustomerStats` entry for the given `customerId`, then:
- Increments `totalRequests`
- Increments `errorCount` if `statusCode >= 400`
- Adds `latencyMs` to `totalLatencyMs`
- Increments `endpointCounts[endpoint]`

**`getSummary(customerId)`**
Returns `null` if the customer is unknown (route maps this to `404`). Otherwise computes and returns:
- `totalRequests`, `errorCount` from stored values
- `averageLatencyMs = totalLatencyMs / totalRequests`
- `topEndpoints` by converting `endpointCounts` to a sorted array (descending by count, alphabetically on ties)

Computation happens at read time. This is acceptable given the expected data volume.

---

## Request / Response Flow

```
POST /events
  → Express JSON middleware
  → Zod validation
      → invalid: 400 + error detail
      → valid: store.recordEvent(event)
  → 201 Created

GET /customers/:customerId/summary
  → store.getSummary(customerId)
      → null: 404
      → found: 200 + summary JSON
```

---

## Error Handling

- Validation failures return `400` with a message describing which field failed and why.
- Unknown customer returns `404`.
- Unexpected errors fall through to an Express error handler that returns `500`.
- All error responses use a consistent shape: `{ "error": "<message>" }`.

---

## Configuration

A single `PORT` environment variable controls the listening port, defaulting to `3000`. No other external configuration is needed for v1.

---

## Testing

**Framework:** Vitest + Supertest

Tests drive the Express app directly via Supertest — no real HTTP server is bound, which keeps tests fast and portable.

The store is reset between tests via a `resetStore()` helper exported from the store module, so each test starts from a clean state without module reloading.

### Test layers

**Unit — store**
Tests for `recordEvent` and `getSummary` in isolation: accumulation logic, error counting, `averageLatencyMs` precision, `topEndpoints` sort order and tie-breaking.

**Integration — routes**
Tests for the full request/response cycle through Express:

- `POST /events`: valid payloads return `201`; missing fields, wrong types, negative `latencyMs`, and invalid timestamps each return `400` with a descriptive error.
- `GET /customers/:customerId/summary`: correct aggregation across multiple events; `404` for unknown customers.

**Edge cases to cover explicitly**
- Customer with a single event (average = that event's latency)
- All requests are errors (`errorCount === totalRequests`)
- `topEndpoints` tie-broken alphabetically
- `latencyMs: 0` is valid; `latencyMs: -1` is not

---

## Security

**Input validation**
Zod rejects unexpected shapes at the boundary. No user-supplied value is interpreted as code or used in a dynamic query, so injection risk is minimal.

**Request size**
Express's built-in JSON middleware accepts large bodies by default. The `limit` option should be set (e.g. `100kb`) to prevent trivially large payloads from consuming memory.

**HTTP headers**
Use `helmet` to set standard security headers (e.g. `X-Content-Type-Options`, `X-Frame-Options`). Low effort, good hygiene even for an internal service.

**No auth**
Explicitly out of scope per the spec. If exposed beyond localhost, a simple API key middleware would be the minimal addition.

**Route parameter safety**
`:customerId` is used only as a Map key — it is never interpolated into a shell command, file path, or query string, so no sanitization beyond Zod's type check is needed.

---

## Load & Performance

**Expected volume:** tens of events/second, a few thousand total — well within single-process Node.js capacity.

**Write path** (`recordEvent`) is O(1): one Map lookup and a fixed number of increments.

**Read path** (`getSummary`) is O(E log E) where E is the number of distinct endpoints per customer. At realistic cardinality this is negligible. If endpoint counts grew into the thousands, maintaining a sorted structure at write time (e.g. a sorted array updated on insert) would move cost to writes and make reads O(1).

**Memory** grows with the number of distinct (customer, endpoint) pairs. At the expected scale this is not a concern. The store module's structure makes it straightforward to add a size cap or eviction policy later.

**No connection pool, no I/O** — the bottleneck is CPU and memory, not external latency.

---

## Reliability & Observability

**Process crashes lose all state** — acceptable for v1 given the in-memory constraint. The natural upgrade path is flushing accumulated stats to SQLite or Redis on `SIGTERM`.

**Logging:** Use a lightweight logger (e.g. `pino`) to emit structured JSON lines for each inbound request (method, path, status, latency). This makes it easy to grep or pipe into a log aggregator later without changing the application.

**Health check:** A `GET /health` route returning `200 OK` costs nothing and enables readiness checks if the service is ever containerized.

**Graceful shutdown:** On `SIGTERM`, stop accepting new connections and let in-flight requests drain before exiting. Express + Node's `server.close()` handles this.

---

## Trade-offs & Notes

| Decision | Rationale |
|---|---|
| Accumulate stats, don't store events | Spec requirement; also keeps memory flat and reads O(1) |
| Compute `topEndpoints` at read time | Simpler write path; acceptable at the expected event volume |
| Zod for validation | Gives typed output after validation, readable schemas, descriptive error messages |
| Single store module | Easy to swap for a DB-backed store later without touching routes |
| No persistence | In-scope for v1; SQLite or Redis would be the natural next step |
| Vitest + Supertest | Fast, no real server needed; store reset between tests keeps isolation simple |
| `helmet` + body size limit | Minimal security hardening with near-zero implementation cost |
