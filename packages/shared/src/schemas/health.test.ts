import { describe, expect, it } from 'vitest';

import { HealthResponseSchema } from './health.js';

describe('HealthResponseSchema', () => {
  it('accepts a well-formed response', () => {
    const parsed = HealthResponseSchema.parse({
      status: 'ok',
      db: 'ok',
      timestamp: '2026-10-09T15:00:00.000Z',
    });

    expect(parsed.status).toBe('ok');
    expect(parsed.db).toBe('ok');
  });

  it('accepts db error state', () => {
    const parsed = HealthResponseSchema.parse({
      status: 'ok',
      db: 'error',
      timestamp: '2026-10-09T15:00:00.000Z',
    });

    expect(parsed.db).toBe('error');
  });

  it('rejects invalid db status', () => {
    expect(() =>
      HealthResponseSchema.parse({
        status: 'ok',
        db: 'degraded',
        timestamp: '2026-10-09T15:00:00.000Z',
      }),
    ).toThrow();
  });

  it('rejects non-iso timestamp', () => {
    expect(() =>
      HealthResponseSchema.parse({
        status: 'ok',
        db: 'ok',
        timestamp: 'yesterday',
      }),
    ).toThrow();
  });
});
