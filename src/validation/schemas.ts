import { z } from 'zod';

const eventSchema = z.object({
  customerId: z.string().min(1),
  endpoint: z.string().min(1),
  timestamp: z.string().datetime(),
  statusCode: z.number().int(),
  latencyMs: z.number().nonnegative(),
});

export type EventInput = z.infer<typeof eventSchema>;

export function validateEvent(data: unknown): EventInput {
  return eventSchema.parse(data);
}
