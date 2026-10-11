/* eslint-disable react-hooks/rules-of-hooks */

import { useQuery } from '@tanstack/react-query';
import type { TopRecurringResponse } from 'shared';

import metricsService from '@/services/metrics.service';
import type { MetricsTopRecurringParams } from '@/services/interfaces/metrics.interface';

import type {
  IMetricsTopRecurringHooks,
  MetricsTopRecurringResult,
} from './interfaces/useMetrics.interface';
import { METRICS_QUERY_KEYS } from './queryKeys';

class MetricsTopRecurringHooks implements IMetricsTopRecurringHooks {
  use(params?: MetricsTopRecurringParams): MetricsTopRecurringResult {
    return useQuery<TopRecurringResponse, unknown>({
      queryKey: METRICS_QUERY_KEYS.topRecurring(params),
      queryFn: () => metricsService.topRecurring(params),
    });
  }
}

const metricsTopRecurringHooks = new MetricsTopRecurringHooks();
export default metricsTopRecurringHooks;
