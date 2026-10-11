import type {
  DwellDistributionResponse,
  HeatmapResponse,
  SummaryResponse,
  TimeseriesResponse,
  TopRecurringResponse,
} from 'shared';

export interface MetricsPeriodParams {
  from?: string;
  to?: string;
}

export interface MetricsTimeseriesParams extends MetricsPeriodParams {
  granularity?: 'day' | 'week';
}

export interface MetricsTopRecurringParams extends MetricsPeriodParams {
  limit?: number;
}

export interface IMetricsService {
  summary(params?: MetricsPeriodParams): Promise<SummaryResponse>;
  heatmap(params?: MetricsPeriodParams): Promise<HeatmapResponse>;
  timeseries(params?: MetricsTimeseriesParams): Promise<TimeseriesResponse>;
  dwellDistribution(params?: MetricsPeriodParams): Promise<DwellDistributionResponse>;
  topRecurring(params?: MetricsTopRecurringParams): Promise<TopRecurringResponse>;
}
