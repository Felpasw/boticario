import type { MetricsQuery } from 'shared';

export class MetricsQueryDto implements MetricsQuery {
  from?: string;
  to?: string;
  granularity?: 'day' | 'week';
}
