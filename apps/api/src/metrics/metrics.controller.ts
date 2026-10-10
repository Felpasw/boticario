import { Controller, Get, Query, UsePipes } from '@nestjs/common';
import type {
  DwellDistributionResponse,
  HeatmapResponse,
  SummaryResponse,
  TimeseriesResponse,
  TopRecurringResponse,
} from 'shared';
import { MetricsQuerySchema, TopRecurringQuerySchema } from 'shared';

import { ZodValidationPipe } from '../@common/infrastructure/pipes/zod-validation.pipe.js';
import { CurrentUser } from '../auth/infrastructure/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/infrastructure/types/authenticated-request.js';
import { GetDwellDistributionUseCase } from './application/use-cases/get-dwell-distribution.use-case.js';
import { GetHeatmapUseCase } from './application/use-cases/get-heatmap.use-case.js';
import { GetSummaryUseCase } from './application/use-cases/get-summary.use-case.js';
import { GetTimeseriesUseCase } from './application/use-cases/get-timeseries.use-case.js';
import { GetTopRecurringUseCase } from './application/use-cases/get-top-recurring.use-case.js';
import { MetricsQueryDto } from './dto/metrics-query.dto.js';
import { TopRecurringQueryDto } from './dto/top-recurring-query.dto.js';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly getSummary: GetSummaryUseCase,
    private readonly getHeatmap: GetHeatmapUseCase,
    private readonly getTimeseries: GetTimeseriesUseCase,
    private readonly getDwellDistribution: GetDwellDistributionUseCase,
    private readonly getTopRecurring: GetTopRecurringUseCase,
  ) {}

  @Get('summary')
  @UsePipes(new ZodValidationPipe(MetricsQuerySchema))
  async summary(
    @Query() query: MetricsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SummaryResponse> {
    return this.getSummary.execute({ user, from: query.from, to: query.to });
  }

  @Get('heatmap')
  @UsePipes(new ZodValidationPipe(MetricsQuerySchema))
  async heatmap(
    @Query() query: MetricsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<HeatmapResponse> {
    return this.getHeatmap.execute({ user, from: query.from, to: query.to });
  }

  @Get('timeseries')
  @UsePipes(new ZodValidationPipe(MetricsQuerySchema))
  async timeseries(
    @Query() query: MetricsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TimeseriesResponse> {
    return this.getTimeseries.execute({
      user,
      from: query.from,
      to: query.to,
      granularity: query.granularity,
    });
  }

  @Get('dwell-distribution')
  @UsePipes(new ZodValidationPipe(MetricsQuerySchema))
  async dwellDistribution(
    @Query() query: MetricsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DwellDistributionResponse> {
    return this.getDwellDistribution.execute({ user, from: query.from, to: query.to });
  }

  @Get('top-recurring')
  @UsePipes(new ZodValidationPipe(TopRecurringQuerySchema))
  async topRecurring(
    @Query() query: TopRecurringQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TopRecurringResponse> {
    return this.getTopRecurring.execute({
      user,
      from: query.from,
      to: query.to,
      limit: query.limit,
    });
  }
}
