import { Injectable, Logger } from '@nestjs/common';
import type { DatabaseStatus, HealthResponse } from 'shared';

import { PrismaService } from '../infrastructure/prisma/prisma.service.js';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponse> {
    const db = await this.pingDatabase();
    return {
      status: 'ok',
      db,
      timestamp: new Date().toISOString(),
    };
  }

  private async pingDatabase(): Promise<DatabaseStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch (error) {
      this.logger.error('Database healthcheck failed', error as Error);
      return 'error';
    }
  }
}
