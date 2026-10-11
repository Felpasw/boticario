import { Inject, Injectable } from '@nestjs/common';
import type { HeatmapResponse } from 'shared';

import {
  METRICS_REPOSITORY,
  type MetricsRepository,
} from '../../domain/ports/metrics-repository.js';
import { resolvePeriod } from '../../domain/services/period-resolver.js';
import type { GetHeatmapInput } from './types/get-heatmap.input.js';

@Injectable()
export class GetHeatmapUseCase {
  constructor(@Inject(METRICS_REPOSITORY) private readonly repo: MetricsRepository) {}

  async execute(input: GetHeatmapInput): Promise<HeatmapResponse> {
    const { from, to } = resolvePeriod({ from: input.from, to: input.to });
    const matrix = await this.repo.heatmapFor({ userId: input.user.id, from, to });
    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      matrix,
    };
  }
}
