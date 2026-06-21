# API Usage Tracker — Implementation Plan

Each step is self-contained and verifiable before moving to the next.

---

## Step 1 — Project scaffold

Set up the Node.js + TypeScript project with all dependencies and tooling configured.

- `package.json` with scripts: `dev`, `build`, `start`, `test`
- `tsconfig.json` targeting Node 18+, strict mode
- Dependencies: `express`, `zod`, `helmet`, `pino`
- Dev dependencies: `typescript`, `tsx`, `vitest`, `supertest`, `@types/*`
- `src/server.ts` as the entry point (reads `PORT`, starts the server)
- `src/app.ts` as the Express app (no routes yet, just `express()` export)

**Verify:** `npm run dev` starts without errors; `curl localhost:3000` returns a 404 from Express (not a connection error).

---

## Step 2 — Store module

Implement the in-memory store with `recordEvent` and `getSummary`, plus a `resetStore` helper for tests.

- `src/store/store.ts`
- `CustomerStats` type with `totalRequests`, `errorCount`, `totalLatencyMs`, `endpointCounts`
- `recordEvent` initializes a new entry if the customer is unknown, then accumulates
- `getSummary` returns `null` for unknown customers; otherwise computes derived fields
- `resetStore` clears the Map (test use only)

**Tests (`store.test.ts`):**
- Recording an event creates a new customer entry
- `totalRequests` increments with each event
- `statusCode >= 400` increments `errorCount`; `statusCode < 400` does not
- `totalLatencyMs` accumulates correctly across multiple events
- `averageLatencyMs` equals `totalLatencyMs / totalRequests`
- `endpointCounts` tracks each endpoint independently
- `topEndpoints` is sorted descending by count
- Tied endpoint counts are broken alphabetically
- Customer with one event: `averageLatencyMs` equals that event's `latencyMs`
- `latencyMs: 0` is recorded correctly
- `getSummary` returns `null` for an unknown customer
- Store is isolated between tests via `resetStore`

---

## Step 3 — Validation schema

Define the Zod schema for the event request body.

- `src/validation/schemas.ts`
- All five fields required: `customerId` (string), `endpoint` (string), `timestamp` (ISO 8601), `statusCode` (integer), `latencyMs` (non-negative number)
- Export a `validateEvent` function that returns a typed object or throws a Zod error

**Tests (`schemas.test.ts`):**
- Valid payload parses successfully and returns a typed object
- Missing any single required field throws
- `latencyMs: -1` throws; `latencyMs: 0` passes
- `statusCode` as a float throws; as an integer passes
- `timestamp` as a plain string (not ISO 8601) throws
- Extra unknown fields are stripped (not passed through)

---

## Step 4 — POST /events route

Wire up the ingest endpoint.

- `src/routes/events.ts`
- Calls `validateEvent`; on failure returns `400` with `{ "error": "<message>" }`
- On success calls `store.recordEvent` and returns `201`
- Mount on the app in `app.ts`

**Tests (`events.route.test.ts` via Supertest):**
- Valid payload returns `201`
- Missing `customerId` returns `400`
- Missing `endpoint` returns `400`
- Missing `timestamp` returns `400`
- Missing `statusCode` returns `400`
- Missing `latencyMs` returns `400`
- `latencyMs: -1` returns `400`
- Invalid `timestamp` format returns `400`
- Successful event is reflected in the store (call `getSummary` after to confirm)

---

## Step 5 — GET /customers/:customerId/summary route

Wire up the summary endpoint.

- `src/routes/customers.ts`
- Calls `store.getSummary(customerId)`; if `null` returns `404`
- Otherwise returns `200` with the summary JSON
- Mount on the app in `app.ts`

**Tests (`customers.route.test.ts` via Supertest):**
- Unknown customer returns `404`
- Known customer returns `200` with correct shape
- `totalRequests` matches the number of ingested events
- `errorCount` reflects events with `statusCode >= 400`
- `averageLatencyMs` is computed correctly
- `topEndpoints` is sorted descending by count, alphabetically on ties
- Summary reflects events from multiple `POST /events` calls in sequence

---

## Step 6 — Middleware & security

Add request hardening and logging to the app.

- `helmet()` middleware mounted before routes
- Express JSON body parser with `limit: '100kb'`
- `pino` request logger middleware (method, path, status, response time)
- `GET /health` route returning `200 OK` with `{ "status": "ok" }`

**Tests:**
- `GET /health` returns `200` with `{ "status": "ok" }`
- `POST /events` with a body over the size limit returns `413`
- Response includes `X-Content-Type-Options` header (helmet active)

---

## Step 7 — Error handler & graceful shutdown

Finalize production-readiness of the server process.

- Express catch-all error handler in `app.ts` returning `500` with `{ "error": "Internal server error" }`
- `SIGTERM` handler in `server.ts`: calls `server.close()` to drain in-flight requests before exiting

**Tests:**
- A route that throws an unhandled error returns `500` with the standard error shape (use a test-only route or mock)

---

## Step 8 — Manual smoke test

End-to-end verification with `curl` against the running server.

- Ingest several events for the same customer, including errors and varied endpoints
- Fetch the summary and confirm all fields match expectations
- Ingest an event with a missing field and confirm `400`
- Fetch summary for an unknown customer and confirm `404`

No automated test for this step — it validates the full running system and confirms the server starts, accepts connections, and responds correctly over the wire.
