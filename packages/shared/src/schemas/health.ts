import { z } from 'zod';

export const DatabaseStatusSchema = z.enum(['ok', 'error']);
export type DatabaseStatus = z.infer<typeof DatabaseStatusSchema>;

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  db: DatabaseStatusSchema,
  timestamp: z.string().datetime(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
