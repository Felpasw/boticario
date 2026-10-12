import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RegisterConnectionRequest } from 'shared';

export class RegisterConnectionDto implements RegisterConnectionRequest {
  @ApiProperty({
    example: 'AA:BB:CC:DD:EE:01',
    description:
      'IEEE 802 MAC address. Hashed with HMAC-SHA256 before storage; never persisted raw.',
    pattern: '^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$',
  })
  macAddress!: string;

  @ApiProperty({
    example: '2026-10-11T12:00:00.000Z',
    description: 'ISO 8601 timestamp when the device connected to the Wi-Fi.',
    format: 'date-time',
  })
  connectedAt!: string;

  @ApiPropertyOptional({
    example: '2026-10-11T12:15:00.000Z',
    description: 'ISO 8601 timestamp when the device disconnected. Must be >= connectedAt.',
    format: 'date-time',
    nullable: true,
  })
  disconnectedAt?: string | null;
}
