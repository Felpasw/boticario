import { Inject, Injectable } from '@nestjs/common';
import type { TimeseriesResponse } from 'shared';

import {
  METRICS_REPOSITORY,
  type MetricsRepository,
} from '../../domain/ports/metrics-repository.js';
import { resolvePeriod } from '../../domain/services/period-resolver.js';
import type { GetTimeseriesInput } from './types/get-timeseries.input.js';

@Injectable()
export class GetTimeseriesUseCase {
  constructor(@Inject(METRICS_REPOSITORY) private readonly repo: MetricsRepository) {}

  async execute(input: GetTimeseriesInput): Promise<TimeseriesResponse> {
    const { from, to } = resolvePeriod({ from: input.from, to: input.to });
    const granularity = input.granularity ?? 'day';
    const series = await this.repo.timeseriesFor({
      userId: input.user.id,
      from,
      to,
      granularity,
    });
    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      granularity,
      series,
    };
  }
}
