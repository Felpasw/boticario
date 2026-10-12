import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ConnectionsQuery } from 'shared';

export class ConnectionsQueryDto implements ConnectionsQuery {
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

  @ApiProperty({ example: 1, default: 1, minimum: 1 })
  page!: number;

  @ApiProperty({ example: 50, default: 50, minimum: 1, maximum: 200 })
  perPage!: number;
}
