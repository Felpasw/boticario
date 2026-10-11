export const METRICS_REPOSITORY = Symbol('METRICS_REPOSITORY');

export interface PeriodArgs {
  userId: string;
  from: Date;
  to: Date;
}

export interface TimeseriesArgs extends PeriodArgs {
  granularity: 'day' | 'week';
}

export interface TopRecurringArgs extends PeriodArgs {
  limit: number;
}

export interface SummaryRow {
  visits: number;
  uniqueVisitors: number;
  uniqueRecurring: number;
  dwellMedianSeconds: number | null;
  dwellAvgSeconds: number | null;
}

export interface HeatmapRow {
  weekday: number;
  hour: number;
  count: number;
}

export type PeakCellRow = HeatmapRow;

export interface TimeseriesRow {
  bucket: string;
  visits: number;
  uniqueVisitors: number;
  newVisitors: number;
  recurringVisitors: number;
}

export interface DwellBucketRow {
  label: string;
  lowerSeconds: number;
  upperSeconds: number | null;
  count: number;
}

export interface DwellDistributionData {
  buckets: DwellBucketRow[];
  totalWithDwell: number;
}

export interface TopRecurringRow {
  deviceId: string;
  visitCount: number;
  firstSeenInPeriodAt: Date;
  lastSeenAt: Date;
  avgDwellSeconds: number | null;
}

export interface MetricsRepository {
  summaryFor(args: PeriodArgs): Promise<SummaryRow>;
  heatmapFor(args: PeriodArgs): Promise<HeatmapRow[]>;
  peakCellFor(args: PeriodArgs): Promise<PeakCellRow | null>;
  timeseriesFor(args: TimeseriesArgs): Promise<TimeseriesRow[]>;
  dwellDistributionFor(args: PeriodArgs): Promise<DwellDistributionData>;
  topRecurringFor(args: TopRecurringArgs): Promise<TopRecurringRow[]>;
}
