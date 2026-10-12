import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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

const PERIOD_EXAMPLE = {
  from: '2026-09-11T00:00:00.000Z',
  to: '2026-10-11T00:00:00.000Z',
};

const SUMMARY_EXAMPLE = {
  period: PERIOD_EXAMPLE,
  kpis: {
    visits: { value: 2837, variation: { pct: 18.87, direction: 'up' } },
    uniqueVisitors: { value: 1881, variation: { pct: 19.05, direction: 'up' } },
    recurringRate: { value: 0.029, variation: { pct: 0, direction: 'flat' } },
    dwellMedianSeconds: { value: 900, variation: { pct: -0.22, direction: 'flat' } },
  },
  alerts: [
    {
      type: 'TRAFFIC_PEAK',
      severity: 'info',
      title: 'Pico de tráfego',
      message: 'Pico em Seg às 13h (28 visitas)',
    },
  ],
};

const HEATMAP_EXAMPLE = {
  period: PERIOD_EXAMPLE,
  matrix: [
    { weekday: 0, hour: 12, count: 28 },
    { weekday: 0, hour: 13, count: 25 },
    { weekday: 1, hour: 12, count: 42 },
  ],
};

const TIMESERIES_EXAMPLE = {
  period: PERIOD_EXAMPLE,
  granularity: 'day',
  series: [
    {
      bucket: '2026-09-11T00:00:00.000Z',
      visits: 72,
      uniqueVisitors: 54,
      newVisitors: 48,
      recurringVisitors: 6,
    },
    {
      bucket: '2026-09-12T00:00:00.000Z',
      visits: 85,
      uniqueVisitors: 63,
      newVisitors: 51,
      recurringVisitors: 12,
    },
  ],
};

const DWELL_EXAMPLE = {
  period: PERIOD_EXAMPLE,
  buckets: [
    { label: '0-5min', lowerSeconds: 0, upperSeconds: 300, count: 93 },
    { label: '5-15min', lowerSeconds: 300, upperSeconds: 900, count: 1324 },
    { label: '15-30min', lowerSeconds: 900, upperSeconds: 1800, count: 1035 },
    { label: '30-60min', lowerSeconds: 1800, upperSeconds: 3600, count: 307 },
    { label: '60+min', lowerSeconds: 3600, upperSeconds: null, count: 78 },
  ],
  totalWithDwell: 2837,
};

const TOP_RECURRING_EXAMPLE = {
  period: PERIOD_EXAMPLE,
  data: [
    {
      deviceId: 'da4364ec-242c-4271-b485-28155a8d7ddf',
      visitCount: 29,
      firstSeenInPeriodAt: '2026-09-11T17:28:00.000Z',
      lastSeenAt: '2026-10-09T19:17:00.000Z',
      avgDwellSeconds: 1056.4,
    },
  ],
};

@ApiTags('metrics')
@ApiCookieAuth('boticario_session')
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
  @ApiOperation({
    summary: 'KPIs + variação vs. período anterior + alertas inline',
    description:
      'Returns the four dashboard KPIs (visits, uniqueVisitors, recurringRate, dwellMedianSeconds) alongside the % variation against the previous equivalent window. Alerts are evaluated by a pure function and capped at 3.',
  })
  @ApiOkResponse({ schema: { example: SUMMARY_EXAMPLE } })
  @ApiUnauthorizedResponse({ description: 'Session cookie missing, expired or revoked.' })
  async summary(
    @Query(new ZodValidationPipe(MetricsQuerySchema))
    query: MetricsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SummaryResponse> {
    return this.getSummary.execute({ user, from: query.from, to: query.to });
  }

  @Get('heatmap')
  @ApiOperation({
    summary: 'Weekday × hour visit matrix',
    description:
      'Grouped by DATE_TRUNC in America/Sao_Paulo. Buckets with zero visits are omitted; the frontend renders a 7×24 grid filling the gaps.',
  })
  @ApiOkResponse({ schema: { example: HEATMAP_EXAMPLE } })
  @ApiUnauthorizedResponse({ description: 'Session cookie missing, expired or revoked.' })
  async heatmap(
    @Query(new ZodValidationPipe(MetricsQuerySchema))
    query: MetricsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<HeatmapResponse> {
    return this.getHeatmap.execute({ user, from: query.from, to: query.to });
  }

  @Get('timeseries')
  @ApiOperation({
    summary: 'Visits over time split into new vs. recurring',
    description:
      'Window-functioned per bucket: newVisitors are devices whose firstSeenAt falls inside the bucket; recurringVisitors are the rest. visits = new + recurring per bucket invariant.',
  })
  @ApiOkResponse({ schema: { example: TIMESERIES_EXAMPLE } })
  @ApiUnauthorizedResponse({ description: 'Session cookie missing, expired or revoked.' })
  async timeseries(
    @Query(new ZodValidationPipe(MetricsQuerySchema))
    query: MetricsQueryDto,
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
  @ApiOperation({
    summary: 'Dwell time histogram in 5 fixed buckets',
    description:
      'Buckets never change (comparability across periods). Connections without disconnectedAt or dwell > 8h are excluded as outliers.',
  })
  @ApiOkResponse({ schema: { example: DWELL_EXAMPLE } })
  @ApiUnauthorizedResponse({ description: 'Session cookie missing, expired or revoked.' })
  async dwellDistribution(
    @Query(new ZodValidationPipe(MetricsQuerySchema))
    query: MetricsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DwellDistributionResponse> {
    return this.getDwellDistribution.execute({ user, from: query.from, to: query.to });
  }

  @Get('top-recurring')
  @ApiOperation({
    summary: 'Top devices by number of visits in the period',
    description:
      'HAVING COUNT(*) >= 2 (one visit is not recurring). Sorted by visitCount desc, lastSeenAt desc. Device ids are UUIDs; the raw MAC is never exposed.',
  })
  @ApiOkResponse({ schema: { example: TOP_RECURRING_EXAMPLE } })
  @ApiUnauthorizedResponse({ description: 'Session cookie missing, expired or revoked.' })
  async topRecurring(
    @Query(new ZodValidationPipe(TopRecurringQuerySchema))
    query: TopRecurringQueryDto,
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
