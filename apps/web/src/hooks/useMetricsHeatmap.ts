/* eslint-disable react-hooks/rules-of-hooks */

import { useQuery } from '@tanstack/react-query';
import type { HeatmapResponse } from 'shared';

import metricsService from '@/services/metrics.service';
import type { MetricsPeriodParams } from '@/services/interfaces/metrics.interface';

import type {
  IMetricsHeatmapHooks,
  MetricsHeatmapResult,
} from './interfaces/useMetrics.interface';
import { METRICS_QUERY_KEYS } from './queryKeys';

class MetricsHeatmapHooks implements IMetricsHeatmapHooks {
  use(params?: MetricsPeriodParams): MetricsHeatmapResult {
    return useQuery<HeatmapResponse, unknown>({
      queryKey: METRICS_QUERY_KEYS.heatmap(params),
      queryFn: () => metricsService.heatmap(params),
    });
  }
}

const metricsHeatmapHooks = new MetricsHeatmapHooks();
export default metricsHeatmapHooks;
