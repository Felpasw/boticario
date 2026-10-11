/* eslint-disable react-hooks/rules-of-hooks */

import { useQuery } from '@tanstack/react-query';
import type { SummaryResponse } from 'shared';

import metricsService from '@/services/metrics.service';
import type { MetricsPeriodParams } from '@/services/interfaces/metrics.interface';

import type {
  IMetricsSummaryHooks,
  MetricsSummaryResult,
} from './interfaces/useMetrics.interface';
import { METRICS_QUERY_KEYS } from './queryKeys';

class MetricsSummaryHooks implements IMetricsSummaryHooks {
  use(params?: MetricsPeriodParams): MetricsSummaryResult {
    return useQuery<SummaryResponse, unknown>({
      queryKey: METRICS_QUERY_KEYS.summary(params),
      queryFn: () => metricsService.summary(params),
    });
  }
}

const metricsSummaryHooks = new MetricsSummaryHooks();
export default metricsSummaryHooks;
