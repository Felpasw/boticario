import { describe, expect, it } from 'vitest';

import { MetricsQuerySchema, TimeseriesBucketSchema, TopRecurringQuerySchema } from './metrics.js';

describe('MetricsQuerySchema', () => {
  it('accepts an empty query (all optional)', () => {
    expect(() => MetricsQuerySchema.parse({})).not.toThrow();
  });

  it('accepts a valid period', () => {
    expect(() =>
      MetricsQuerySchema.parse({
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-10-01T00:00:00.000Z',
        granularity: 'day',
      }),
    ).not.toThrow();
  });

  it('rejects to < from', () => {
    expect(() =>
      MetricsQuerySchema.parse({
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-09-01T00:00:00.000Z',
      }),
    ).toThrow();
  });

  it('rejects windows larger than 365 days', () => {
    expect(() =>
      MetricsQuerySchema.parse({
        from: '2024-01-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow();
  });
});

describe('TopRecurringQuerySchema', () => {
  it('defaults limit to 10', () => {
    expect(TopRecurringQuerySchema.parse({}).limit).toBe(10);
  });

  it('rejects limit above 50', () => {
    expect(() => TopRecurringQuerySchema.parse({ limit: 100 })).toThrow();
  });
});

describe('TimeseriesBucketSchema', () => {
  it('accepts when new + recurring equals unique', () => {
    expect(() =>
      TimeseriesBucketSchema.parse({
        bucket: '2026-09-08',
        visits: 34,
        uniqueVisitors: 22,
        newVisitors: 15,
        recurringVisitors: 7,
      }),
    ).not.toThrow();
  });

  it('rejects when the invariant breaks', () => {
    expect(() =>
      TimeseriesBucketSchema.parse({
        bucket: '2026-09-08',
        visits: 34,
        uniqueVisitors: 22,
        newVisitors: 15,
        recurringVisitors: 8,
      }),
    ).toThrow();
  });
});
