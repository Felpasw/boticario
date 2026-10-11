import { Inject, Injectable } from '@nestjs/common';
import type { TopRecurringResponse } from 'shared';

import {
  METRICS_REPOSITORY,
  type MetricsRepository,
} from '../../domain/ports/metrics-repository.js';
import { resolvePeriod } from '../../domain/services/period-resolver.js';
import type { GetTopRecurringInput } from './types/get-top-recurring.input.js';

@Injectable()
export class GetTopRecurringUseCase {
  constructor(@Inject(METRICS_REPOSITORY) private readonly repo: MetricsRepository) {}

  async execute(input: GetTopRecurringInput): Promise<TopRecurringResponse> {
    const { from, to } = resolvePeriod({ from: input.from, to: input.to });
    const rows = await this.repo.topRecurringFor({
      userId: input.user.id,
      from,
      to,
      limit: input.limit,
    });
    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      data: rows.map((r) => ({
        deviceId: r.deviceId,
        visitCount: r.visitCount,
        firstSeenInPeriodAt: r.firstSeenInPeriodAt.toISOString(),
        lastSeenAt: r.lastSeenAt.toISOString(),
        avgDwellSeconds: r.avgDwellSeconds,
      })),
    };
  }
}
