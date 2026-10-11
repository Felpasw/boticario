import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type {
  DwellDistributionData,
  HeatmapRow,
  MetricsRepository,
  PeakCellRow,
  PeriodArgs,
  SummaryRow,
  TimeseriesArgs,
  TopRecurringArgs,
  TopRecurringRow,
  TimeseriesRow,
} from '../../domain/ports/metrics-repository.js';

const MAX_DWELL_SECONDS = 8 * 60 * 60;
const STORE_TIMEZONE = 'America/Sao_Paulo';

@Injectable()
export class PrismaMetricsRepository implements MetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async summaryFor({ userId, from, to }: PeriodArgs): Promise<SummaryRow> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        visits: bigint;
        uniqueVisitors: bigint;
        uniqueRecurring: bigint;
        dwellMedianSeconds: number | null;
        dwellAvgSeconds: number | null;
      }>
    >(Prisma.sql`
      SELECT
        COUNT(*)::bigint AS "visits",
        COUNT(DISTINCT d."macHash")::bigint AS "uniqueVisitors",
        COUNT(DISTINCT CASE WHEN d."firstSeenAt" < ${from} THEN d."macHash" END)::bigint AS "uniqueRecurring",
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY c."durationSeconds"
        ) FILTER (WHERE c."disconnectedAt" IS NOT NULL AND c."durationSeconds" <= ${MAX_DWELL_SECONDS}) AS "dwellMedianSeconds",
        AVG(c."durationSeconds") FILTER (
          WHERE c."disconnectedAt" IS NOT NULL AND c."durationSeconds" <= ${MAX_DWELL_SECONDS}
        )::float AS "dwellAvgSeconds"
      FROM "Connection" c
      JOIN "Device" d ON d.id = c."deviceId"
      WHERE c."userId" = ${userId}
        AND c."connectedAt" BETWEEN ${from} AND ${to}
    `);
    const row = rows[0];
    return {
      visits: Number(row?.visits ?? 0),
      uniqueVisitors: Number(row?.uniqueVisitors ?? 0),
      uniqueRecurring: Number(row?.uniqueRecurring ?? 0),
      dwellMedianSeconds: row?.dwellMedianSeconds ?? null,
      dwellAvgSeconds: row?.dwellAvgSeconds ?? null,
    };
  }

  async heatmapFor({ userId, from, to }: PeriodArgs): Promise<HeatmapRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ weekday: number; hour: number; count: bigint }>
    >(Prisma.sql`
      SELECT
        EXTRACT(DOW FROM c."connectedAt" AT TIME ZONE ${STORE_TIMEZONE})::int AS "weekday",
        EXTRACT(HOUR FROM c."connectedAt" AT TIME ZONE ${STORE_TIMEZONE})::int AS "hour",
        COUNT(*)::bigint AS "count"
      FROM "Connection" c
      WHERE c."userId" = ${userId}
        AND c."connectedAt" BETWEEN ${from} AND ${to}
      GROUP BY 1, 2
      ORDER BY 1, 2
    `);
    return rows.map((r) => ({ weekday: r.weekday, hour: r.hour, count: Number(r.count) }));
  }

  async peakCellFor({ userId, from, to }: PeriodArgs): Promise<PeakCellRow | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{ weekday: number; hour: number; count: bigint }>
    >(Prisma.sql`
      SELECT
        EXTRACT(DOW FROM c."connectedAt" AT TIME ZONE ${STORE_TIMEZONE})::int AS "weekday",
        EXTRACT(HOUR FROM c."connectedAt" AT TIME ZONE ${STORE_TIMEZONE})::int AS "hour",
        COUNT(*)::bigint AS "count"
      FROM "Connection" c
      WHERE c."userId" = ${userId}
        AND c."connectedAt" BETWEEN ${from} AND ${to}
      GROUP BY 1, 2
      ORDER BY COUNT(*) DESC, 1, 2
      LIMIT 1
    `);
    const row = rows[0];
    if (!row) return null;
    return { weekday: row.weekday, hour: row.hour, count: Number(row.count) };
  }

  async timeseriesFor({ userId, from, to, granularity }: TimeseriesArgs): Promise<TimeseriesRow[]> {
    const truncUnit = granularity === 'week' ? 'week' : 'day';
    const rows = await this.prisma.$queryRaw<
      Array<{
        bucket: Date;
        visits: bigint;
        uniqueVisitors: bigint;
        newVisitors: bigint;
        recurringVisitors: bigint;
      }>
    >(Prisma.sql`
      SELECT
        DATE_TRUNC(${truncUnit}, c."connectedAt" AT TIME ZONE ${STORE_TIMEZONE}) AS "bucket",
        COUNT(*)::bigint AS "visits",
        COUNT(DISTINCT d."macHash")::bigint AS "uniqueVisitors",
        COUNT(DISTINCT CASE
          WHEN d."firstSeenAt" >= DATE_TRUNC(${truncUnit}, c."connectedAt" AT TIME ZONE ${STORE_TIMEZONE})
          THEN d."macHash" END)::bigint AS "newVisitors",
        COUNT(DISTINCT CASE
          WHEN d."firstSeenAt" < DATE_TRUNC(${truncUnit}, c."connectedAt" AT TIME ZONE ${STORE_TIMEZONE})
          THEN d."macHash" END)::bigint AS "recurringVisitors"
      FROM "Connection" c
      JOIN "Device" d ON d.id = c."deviceId"
      WHERE c."userId" = ${userId}
        AND c."connectedAt" BETWEEN ${from} AND ${to}
      GROUP BY 1
      ORDER BY 1
    `);
    return rows.map((r) => ({
      bucket: r.bucket.toISOString().slice(0, 10),
      visits: Number(r.visits),
      uniqueVisitors: Number(r.uniqueVisitors),
      newVisitors: Number(r.newVisitors),
      recurringVisitors: Number(r.recurringVisitors),
    }));
  }

  async dwellDistributionFor({ userId, from, to }: PeriodArgs): Promise<DwellDistributionData> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        label: string;
        lowerSeconds: number;
        upperSeconds: number | null;
        count: bigint;
        totalWithDwell: bigint;
      }>
    >(Prisma.sql`
      WITH labels(label, "lowerSeconds", "upperSeconds", ord) AS (
        VALUES
          ('0-5min'::text, 0, 300::int, 1),
          ('5-15min', 300, 900, 2),
          ('15-30min', 900, 1800, 3),
          ('30-60min', 1800, 3600, 4),
          ('60+min', 3600, NULL::int, 5)
      ),
      bucket_counts AS (
        SELECT
          CASE
            WHEN "durationSeconds" < 300 THEN '0-5min'
            WHEN "durationSeconds" < 900 THEN '5-15min'
            WHEN "durationSeconds" < 1800 THEN '15-30min'
            WHEN "durationSeconds" < 3600 THEN '30-60min'
            ELSE '60+min'
          END AS label,
          COUNT(*)::bigint AS count
        FROM "Connection"
        WHERE "userId" = ${userId}
          AND "connectedAt" BETWEEN ${from} AND ${to}
          AND "disconnectedAt" IS NOT NULL
          AND "durationSeconds" <= ${MAX_DWELL_SECONDS}
        GROUP BY label
      )
      SELECT
        labels.label,
        labels."lowerSeconds",
        labels."upperSeconds",
        COALESCE(bucket_counts.count, 0::bigint) AS count,
        SUM(COALESCE(bucket_counts.count, 0::bigint)) OVER () AS "totalWithDwell"
      FROM labels
      LEFT JOIN bucket_counts USING (label)
      ORDER BY labels.ord
    `);
    return {
      buckets: rows.map((r) => ({
        label: r.label,
        lowerSeconds: r.lowerSeconds,
        upperSeconds: r.upperSeconds,
        count: Number(r.count),
      })),
      totalWithDwell: Number(rows[0]?.totalWithDwell ?? 0),
    };
  }

  async topRecurringFor({ userId, from, to, limit }: TopRecurringArgs): Promise<TopRecurringRow[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        deviceId: string;
        visitCount: bigint;
        firstSeenInPeriodAt: Date;
        lastSeenAt: Date;
        avgDwellSeconds: number | null;
      }>
    >(Prisma.sql`
      SELECT
        "deviceId",
        COUNT(*)::bigint AS "visitCount",
        MIN("connectedAt") AS "firstSeenInPeriodAt",
        MAX("connectedAt") AS "lastSeenAt",
        AVG("durationSeconds")::float AS "avgDwellSeconds"
      FROM "Connection"
      WHERE "userId" = ${userId}
        AND "connectedAt" BETWEEN ${from} AND ${to}
      GROUP BY "deviceId"
      HAVING COUNT(*) >= 2
      ORDER BY COUNT(*) DESC, MAX("connectedAt") DESC
      LIMIT ${limit}
    `);
    return rows.map((r) => ({
      deviceId: r.deviceId,
      visitCount: Number(r.visitCount),
      firstSeenInPeriodAt: r.firstSeenInPeriodAt,
      lastSeenAt: r.lastSeenAt,
      avgDwellSeconds: r.avgDwellSeconds ?? null,
    }));
  }
}
