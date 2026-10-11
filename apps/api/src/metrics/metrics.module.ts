import { Module } from '@nestjs/common';

import { GetDwellDistributionUseCase } from './application/use-cases/get-dwell-distribution.use-case.js';
import { GetHeatmapUseCase } from './application/use-cases/get-heatmap.use-case.js';
import { GetSummaryUseCase } from './application/use-cases/get-summary.use-case.js';
import { GetTimeseriesUseCase } from './application/use-cases/get-timeseries.use-case.js';
import { GetTopRecurringUseCase } from './application/use-cases/get-top-recurring.use-case.js';
import { METRICS_REPOSITORY } from './domain/ports/metrics-repository.js';
import { PrismaMetricsRepository } from './infrastructure/repositories/prisma-metrics.repository.js';
import { MetricsController } from './metrics.controller.js';

@Module({
  controllers: [MetricsController],
  providers: [
    GetSummaryUseCase,
    GetHeatmapUseCase,
    GetTimeseriesUseCase,
    GetDwellDistributionUseCase,
    GetTopRecurringUseCase,
    { provide: METRICS_REPOSITORY, useClass: PrismaMetricsRepository },
  ],
})
export class MetricsModule {}
