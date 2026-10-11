/* eslint-disable react-hooks/rules-of-hooks */

import { useQuery } from '@tanstack/react-query';
import type { DwellDistributionResponse } from 'shared';

import metricsService from '@/services/metrics.service';
import type { MetricsPeriodParams } from '@/services/interfaces/metrics.interface';

import type {
  IMetricsDwellDistributionHooks,
  MetricsDwellDistributionResult,
} from './interfaces/useMetrics.interface';
import { METRICS_QUERY_KEYS } from './queryKeys';

class MetricsDwellDistributionHooks implements IMetricsDwellDistributionHooks {
  use(params?: MetricsPeriodParams): MetricsDwellDistributionResult {
    return useQuery<DwellDistributionResponse, unknown>({
      queryKey: METRICS_QUERY_KEYS.dwellDistribution(params),
      queryFn: () => metricsService.dwellDistribution(params),
    });
  }
}

const metricsDwellDistributionHooks = new MetricsDwellDistributionHooks();
export default metricsDwellDistributionHooks;
