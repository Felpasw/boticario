/* eslint-disable react-hooks/rules-of-hooks */

import { useQuery } from '@tanstack/react-query';
import type { TimeseriesResponse } from 'shared';

import metricsService from '@/services/metrics.service';
import type { MetricsTimeseriesParams } from '@/services/interfaces/metrics.interface';

import type {
  IMetricsTimeseriesHooks,
  MetricsTimeseriesResult,
} from './interfaces/useMetrics.interface';
import { METRICS_QUERY_KEYS } from './queryKeys';

class MetricsTimeseriesHooks implements IMetricsTimeseriesHooks {
  use(params?: MetricsTimeseriesParams): MetricsTimeseriesResult {
    return useQuery<TimeseriesResponse, unknown>({
      queryKey: METRICS_QUERY_KEYS.timeseries(params),
      queryFn: () => metricsService.timeseries(params),
    });
  }
}

const metricsTimeseriesHooks = new MetricsTimeseriesHooks();
export default metricsTimeseriesHooks;
