import type { UseQueryResult } from '@tanstack/react-query';
import type {
  DwellDistributionResponse,
  HeatmapResponse,
  SummaryResponse,
  TimeseriesResponse,
  TopRecurringResponse,
} from 'shared';

import type {
  MetricsPeriodParams,
  MetricsTimeseriesParams,
  MetricsTopRecurringParams,
} from '@/services/interfaces/metrics.interface';

export type MetricsSummaryResult = UseQueryResult<SummaryResponse, unknown>;
export type MetricsHeatmapResult = UseQueryResult<HeatmapResponse, unknown>;
export type MetricsTimeseriesResult = UseQueryResult<TimeseriesResponse, unknown>;
export type MetricsDwellDistributionResult = UseQueryResult<DwellDistributionResponse, unknown>;
export type MetricsTopRecurringResult = UseQueryResult<TopRecurringResponse, unknown>;

export interface IMetricsSummaryHooks {
  use(params?: MetricsPeriodParams): MetricsSummaryResult;
}

export interface IMetricsHeatmapHooks {
  use(params?: MetricsPeriodParams): MetricsHeatmapResult;
}

export interface IMetricsTimeseriesHooks {
  use(params?: MetricsTimeseriesParams): MetricsTimeseriesResult;
}

export interface IMetricsDwellDistributionHooks {
  use(params?: MetricsPeriodParams): MetricsDwellDistributionResult;
}

export interface IMetricsTopRecurringHooks {
  use(params?: MetricsTopRecurringParams): MetricsTopRecurringResult;
}
