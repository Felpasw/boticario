import { z } from 'zod';

const MAX_WINDOW_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

export const PeriodSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});
export type Period = z.infer<typeof PeriodSchema>;

export const MetricsQuerySchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    granularity: z.enum(['day', 'week']).optional(),
  })
  .refine(({ from, to }) => !(from && to) || new Date(to) >= new Date(from), {
    path: ['to'],
    message: 'to must be greater than or equal to from',
  })
  .refine(
    ({ from, to }) =>
      !(from && to) ||
      (new Date(to).getTime() - new Date(from).getTime()) / DAY_MS <= MAX_WINDOW_DAYS,
    { path: ['to'], message: `window must be <= ${MAX_WINDOW_DAYS} days` },
  );
export type MetricsQuery = z.infer<typeof MetricsQuerySchema>;

const DEFAULT_TOP_RECURRING_LIMIT = 10;
const MAX_TOP_RECURRING_LIMIT = 50;

export const TopRecurringQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_TOP_RECURRING_LIMIT)
    .default(DEFAULT_TOP_RECURRING_LIMIT),
});
export type TopRecurringQuery = z.infer<typeof TopRecurringQuerySchema>;

export const VariationDirectionSchema = z.enum(['up', 'down', 'flat']);
export type VariationDirection = z.infer<typeof VariationDirectionSchema>;

export const VariationSchema = z.object({
  pct: z.number(),
  direction: VariationDirectionSchema,
});
export type Variation = z.infer<typeof VariationSchema>;

export const KpiBlockSchema = z.object({
  value: z.number(),
  variation: VariationSchema,
});
export type KpiBlock = z.infer<typeof KpiBlockSchema>;

export const AlertTypeSchema = z.enum([
  'TRAFFIC_PEAK',
  'LOW_TRAFFIC_DAY',
  'NEW_RECORD',
  'TREND_UP',
  'TREND_DOWN',
]);
export type AlertType = z.infer<typeof AlertTypeSchema>;

export const AlertSeveritySchema = z.enum(['info', 'warning', 'success']);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

export const AlertSchema = z.object({
  type: AlertTypeSchema,
  severity: AlertSeveritySchema,
  title: z.string(),
  message: z.string(),
});
export type Alert = z.infer<typeof AlertSchema>;

export const SummaryResponseSchema = z.object({
  period: PeriodSchema,
  kpis: z.object({
    visits: KpiBlockSchema,
    uniqueVisitors: KpiBlockSchema,
    recurringRate: KpiBlockSchema,
    dwellMedianSeconds: KpiBlockSchema,
  }),
  alerts: z.array(AlertSchema).max(3),
});
export type SummaryResponse = z.infer<typeof SummaryResponseSchema>;

export const HeatmapCellSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  hour: z.number().int().min(0).max(23),
  count: z.number().int().nonnegative(),
});
export type HeatmapCell = z.infer<typeof HeatmapCellSchema>;

export const HeatmapResponseSchema = z.object({
  period: PeriodSchema,
  matrix: z.array(HeatmapCellSchema),
});
export type HeatmapResponse = z.infer<typeof HeatmapResponseSchema>;

export const TimeseriesBucketSchema = z
  .object({
    bucket: z.string(),
    visits: z.number().int().nonnegative(),
    uniqueVisitors: z.number().int().nonnegative(),
    newVisitors: z.number().int().nonnegative(),
    recurringVisitors: z.number().int().nonnegative(),
  })
  .refine((b) => b.newVisitors + b.recurringVisitors === b.uniqueVisitors, {
    message: 'newVisitors + recurringVisitors must equal uniqueVisitors',
  });
export type TimeseriesBucket = z.infer<typeof TimeseriesBucketSchema>;

export const TimeseriesResponseSchema = z.object({
  period: PeriodSchema,
  granularity: z.enum(['day', 'week']),
  series: z.array(TimeseriesBucketSchema),
});
export type TimeseriesResponse = z.infer<typeof TimeseriesResponseSchema>;

export const DwellBucketSchema = z.object({
  label: z.string(),
  lowerSeconds: z.number().int().nonnegative(),
  upperSeconds: z.number().int().positive().nullable(),
  count: z.number().int().nonnegative(),
});
export type DwellBucket = z.infer<typeof DwellBucketSchema>;

export const DwellDistributionResponseSchema = z.object({
  period: PeriodSchema,
  buckets: z.array(DwellBucketSchema),
  totalWithDwell: z.number().int().nonnegative(),
});
export type DwellDistributionResponse = z.infer<typeof DwellDistributionResponseSchema>;

export const TopRecurringItemSchema = z.object({
  deviceId: z.string().uuid(),
  visitCount: z.number().int().nonnegative(),
  firstSeenInPeriodAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  avgDwellSeconds: z.number().nonnegative().nullable(),
});
export type TopRecurringItem = z.infer<typeof TopRecurringItemSchema>;

export const TopRecurringResponseSchema = z.object({
  period: PeriodSchema,
  data: z.array(TopRecurringItemSchema),
});
export type TopRecurringResponse = z.infer<typeof TopRecurringResponseSchema>;
