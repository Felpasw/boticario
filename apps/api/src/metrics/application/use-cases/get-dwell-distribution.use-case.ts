import { Inject, Injectable } from '@nestjs/common';
import type { DwellDistributionResponse } from 'shared';

import {
  METRICS_REPOSITORY,
  type MetricsRepository,
} from '../../domain/ports/metrics-repository.js';
import { resolvePeriod } from '../../domain/services/period-resolver.js';
import type { GetDwellDistributionInput } from './types/get-dwell-distribution.input.js';

@Injectable()
export class GetDwellDistributionUseCase {
  constructor(@Inject(METRICS_REPOSITORY) private readonly repo: MetricsRepository) {}

  async execute(input: GetDwellDistributionInput): Promise<DwellDistributionResponse> {
    const { from, to } = resolvePeriod({ from: input.from, to: input.to });
    const { buckets, totalWithDwell } = await this.repo.dwellDistributionFor({
      userId: input.user.id,
      from,
      to,
    });
    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      buckets,
      totalWithDwell,
    };
  }
}
