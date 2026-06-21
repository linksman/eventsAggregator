import { Counter, Gauge, Histogram, Registry } from 'prom-client';

export const registry = new Registry();

export const eventsIngestedTotal = new Counter({
  name: 'events_ingested_total',
  help: 'Valid POST /events accepted',
  registers: [registry],
});

export const eventsRejectedTotal = new Counter({
  name: 'events_rejected_total',
  help: 'Invalid events rejected',
  registers: [registry],
});

export const usageEventsErrorTotal = new Counter({
  name: 'usage_events_error_total',
  help: 'Ingested events with statusCode >= 400',
  registers: [registry],
});

export const usageEventLatencyMs = new Histogram({
  name: 'usage_event_latency_ms',
  help: 'latencyMs from the event payload',
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [registry],
});

export const customersTracked = new Gauge({
  name: 'customers_tracked',
  help: 'Number of customer IDs in memory',
  registers: [registry],
});

export function resetMetrics(): void {
  eventsIngestedTotal.reset();
  eventsRejectedTotal.reset();
  usageEventsErrorTotal.reset();
  usageEventLatencyMs.reset();
  customersTracked.set(0);
}
