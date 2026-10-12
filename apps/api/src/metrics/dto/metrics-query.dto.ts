import { ApiPropertyOptional } from '@nestjs/swagger';
import type { MetricsQuery } from 'shared';

export class MetricsQueryDto implements MetricsQuery {
  @ApiPropertyOptional({
    example: '2026-09-11T00:00:00.000Z',
    description: 'ISO 8601 start of the period. Defaults to 30 days ago.',
    format: 'date-time',
  })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-10-11T00:00:00.000Z',
    description: 'ISO 8601 end of the period. Defaults to now.',
    format: 'date-time',
  })
  to?: string;

  @ApiPropertyOptional({
    enum: ['day', 'week'],
    example: 'day',
    description: 'Only applied to GET /metrics/timeseries. Defaults to "day".',
  })
  granularity?: 'day' | 'week';
}
