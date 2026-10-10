import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from 'shared';

import { Public } from '../auth/infrastructure/decorators/public.decorator.js';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  async check(): Promise<HealthResponse> {
    return this.healthService.check();
  }
}
