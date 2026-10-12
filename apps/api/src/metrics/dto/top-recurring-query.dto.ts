import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TopRecurringQuery } from 'shared';

export class TopRecurringQueryDto implements TopRecurringQuery {
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

  @ApiProperty({ example: 10, default: 10, minimum: 1, maximum: 50 })
  limit!: number;
}
