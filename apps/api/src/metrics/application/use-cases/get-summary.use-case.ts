import { Inject, Injectable } from '@nestjs/common';
import type { SummaryResponse } from 'shared';

import {
  METRICS_REPOSITORY,
  type MetricsRepository,
} from '../../domain/ports/metrics-repository.js';
import { evaluateAlerts } from '../../domain/services/alerts-evaluator.js';
import { calcVariation } from '../../domain/services/metrics-calculator.js';
import { resolvePeriod } from '../../domain/services/period-resolver.js';
import type { GetSummaryInput } from './types/get-summary.input.js';

@Injectable()
export class GetSummaryUseCase {
  constructor(@Inject(METRICS_REPOSITORY) private readonly repo: MetricsRepository) {}

  async execute(input: GetSummaryInput): Promise<SummaryResponse> {
    const { from, to, prevFrom, prevTo } = resolvePeriod({ from: input.from, to: input.to });
    const userId = input.user.id;

    const [current, previous, peak] = await Promise.all([
      this.repo.summaryFor({ userId, from, to }),
      this.repo.summaryFor({ userId, from: prevFrom, to: prevTo }),
      this.repo.peakCellFor({ userId, from, to }),
    ]);

    const currentRecurringRate =
      current.uniqueVisitors === 0 ? 0 : current.uniqueRecurring / current.uniqueVisitors;
    const previousRecurringRate =
      previous.uniqueVisitors === 0 ? 0 : previous.uniqueRecurring / previous.uniqueVisitors;

    const visitsVariation = calcVariation(current.visits, previous.visits);

    const alerts = evaluateAlerts({
      currentVisits: current.visits,
      previousVisits: previous.visits,
      visitsVariationPct: visitsVariation.pct,
      peak,
    });

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      kpis: {
        visits: { value: current.visits, variation: visitsVariation },
        uniqueVisitors: {
          value: current.uniqueVisitors,
          variation: calcVariation(current.uniqueVisitors, previous.uniqueVisitors),
        },
        recurringRate: {
          value: currentRecurringRate,
          variation: calcVariation(currentRecurringRate, previousRecurringRate),
        },
        dwellMedianSeconds: {
          value: current.dwellMedianSeconds ?? 0,
          variation: calcVariation(
            current.dwellMedianSeconds ?? 0,
            previous.dwellMedianSeconds ?? 0,
          ),
        },
      },
      alerts,
    };
  }
}
