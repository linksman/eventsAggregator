# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server with hot reload (tsx watch)
npm run build     # compile TypeScript to dist/
npm start         # run compiled output
npm test          # run all tests (vitest run)
npx vitest run src/store/store.test.ts   # run a single test file
```

## Architecture

This is a Node.js + Express + TypeScript ESM project (`"type": "module"`). All imports within `src/` must use `.js` extensions even though the source files are `.ts` — this is the TypeScript ESM convention.

**`src/app.ts`** — creates and exports the Express app (middleware + routes). No `listen()` call.
**`src/server.ts`** — imports `app`, binds the port, handles `SIGTERM`. Never imported by tests.

This split is intentional: tests import `app` directly via Supertest without opening a socket.

### Planned structure (per `docs/PLAN.md`)

```
src/
  app.ts
  server.ts
  routes/
    events.ts       # POST /events
    customers.ts    # GET /customers/:customerId/summary
  store/
    store.ts        # in-memory Map<customerId, CustomerStats>; also exports resetStore() for tests
  validation/
    schemas.ts      # Zod schema + validateEvent()
```

### Key design rules

- **Store is the only place** that reads or writes `CustomerStats`. Routes call store functions; no business logic in route handlers.
- **`resetStore()`** is called in `beforeEach` to isolate tests — no module reloading needed.
- `topEndpoints` is sorted at read time (in `getSummary`), not at write time.
- All error responses use `{ "error": "<message>" }`.
- `statusCode >= 400` counts as an error; `latencyMs < 0` is rejected at validation.

### Docs

- `docs/SPEC.md` — full requirements
- `docs/DESIGN.md` — architecture decisions and non-functional concerns
- `docs/PLAN.md` — step-by-step build order with test cases per step
