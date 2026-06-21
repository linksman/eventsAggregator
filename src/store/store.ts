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

export type Event = {
  customerId: string;
  endpoint: string;
  timestamp: string;
  statusCode: number;
  latencyMs: number;
};

const store = new Map<string, CustomerStats>();

export function recordEvent(event: Event): void {
  let stats = store.get(event.customerId);
  if (!stats) {
    stats = { totalRequests: 0, errorCount: 0, totalLatencyMs: 0, endpointCounts: new Map() };
    store.set(event.customerId, stats);
  }

  stats.totalRequests += 1;
  if (event.statusCode >= 400) stats.errorCount += 1;
  stats.totalLatencyMs += event.latencyMs;
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
}
