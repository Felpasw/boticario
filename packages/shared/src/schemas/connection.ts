import { z } from 'zod';

export const MacAddressSchema = z
  .string()
  .regex(/^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/, 'invalid IEEE 802 MAC address');

export const RegisterConnectionRequestSchema = z
  .object({
    macAddress: MacAddressSchema,
    connectedAt: z.string().datetime(),
    disconnectedAt: z.string().datetime().nullish(),
  })
  .refine(
    (data) => !data.disconnectedAt || new Date(data.disconnectedAt) >= new Date(data.connectedAt),
    {
      path: ['disconnectedAt'],
      message: 'disconnectedAt must be greater than or equal to connectedAt',
    },
  );
export type RegisterConnectionRequest = z.infer<typeof RegisterConnectionRequestSchema>;

export const ConnectionViewSchema = z.object({
  id: z.string().uuid(),
  deviceId: z.string().uuid(),
  connectedAt: z.string().datetime(),
  disconnectedAt: z.string().datetime().nullable(),
  durationSeconds: z.number().int().nonnegative().nullable(),
});
export type ConnectionView = z.infer<typeof ConnectionViewSchema>;

const MAX_PER_PAGE = 200;
const DEFAULT_PER_PAGE = 50;

export const ConnectionsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(MAX_PER_PAGE).default(DEFAULT_PER_PAGE),
});
export type ConnectionsQuery = z.infer<typeof ConnectionsQuerySchema>;

export const ConnectionsListResponseSchema = z.object({
  data: z.array(ConnectionViewSchema),
  page: z.number().int().positive(),
  perPage: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type ConnectionsListResponse = z.infer<typeof ConnectionsListResponseSchema>;
