type CustomerStats = {
  totalRequests: number;
  errorCount: number;
  totalLatencyMs: number;
  endpointCounts: Map<string, number>;
};

type EndpointCount = { endpoint: string; count: number };

export type Summary = {
  customerId: string;
  totalRequests: number;
  errorCount: number;
  averageLatencyMs: number;
  topEndpoints: EndpointCount[];
};

import type { EventInput } from '../validation/schemas.js';
import { customersTracked, usageEventsErrorTotal, usageEventLatencyMs } from '../metrics.js';

const store = new Map<string, CustomerStats>();

export function recordEvent(event: EventInput): void {
  let stats = store.get(event.customerId);
  if (!stats) {
    stats = { totalRequests: 0, errorCount: 0, totalLatencyMs: 0, endpointCounts: new Map() };
    store.set(event.customerId, stats);
    customersTracked.inc();
  }

  stats.totalRequests += 1;
  if (event.statusCode >= 400) {
    stats.errorCount += 1;
    usageEventsErrorTotal.inc();
  }
  stats.totalLatencyMs += event.latencyMs;
  usageEventLatencyMs.observe(event.latencyMs);
  stats.endpointCounts.set(event.endpoint, (stats.endpointCounts.get(event.endpoint) ?? 0) + 1);
}

export function getSummary(customerId: string): Summary | null {
  const stats = store.get(customerId);
  if (!stats) return null;

  const topEndpoints: EndpointCount[] = Array.from(stats.endpointCounts.entries())
    .map(([endpoint, count]) => ({ endpoint, count }))
    .sort((a, b) => b.count - a.count || a.endpoint.localeCompare(b.endpoint));

  return {
    customerId,
    totalRequests: stats.totalRequests,
    errorCount: stats.errorCount,
    averageLatencyMs: stats.totalLatencyMs / stats.totalRequests,
    topEndpoints,
  };
}

export function resetStore(): void {
  store.clear();
  customersTracked.set(0);
}
