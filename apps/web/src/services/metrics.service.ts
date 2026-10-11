import type {
  DwellDistributionResponse,
  HeatmapResponse,
  SummaryResponse,
  TimeseriesResponse,
  TopRecurringResponse,
} from 'shared';

import api from '@/api';

import type {
  IMetricsService,
  MetricsPeriodParams,
  MetricsTimeseriesParams,
  MetricsTopRecurringParams,
} from './interfaces/metrics.interface';

class MetricsService implements IMetricsService {
  async summary(params?: MetricsPeriodParams): Promise<SummaryResponse> {
    const { data } = await api.get<SummaryResponse>('/metrics/summary', { params });
    return data;
  }

  async heatmap(params?: MetricsPeriodParams): Promise<HeatmapResponse> {
    const { data } = await api.get<HeatmapResponse>('/metrics/heatmap', { params });
    return data;
  }

  async timeseries(params?: MetricsTimeseriesParams): Promise<TimeseriesResponse> {
    const { data } = await api.get<TimeseriesResponse>('/metrics/timeseries', { params });
    return data;
  }

  async dwellDistribution(params?: MetricsPeriodParams): Promise<DwellDistributionResponse> {
    const { data } = await api.get<DwellDistributionResponse>('/metrics/dwell-distribution', {
      params,
    });
    return data;
  }

  async topRecurring(params?: MetricsTopRecurringParams): Promise<TopRecurringResponse> {
    const { data } = await api.get<TopRecurringResponse>('/metrics/top-recurring', { params });
    return data;
  }
}

const metricsService = new MetricsService();
export default metricsService;
