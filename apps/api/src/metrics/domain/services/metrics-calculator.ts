import type { Variation, VariationDirection } from 'shared';

const FLAT_THRESHOLD_PCT = 0.5;

export function calcVariation(current: number, previous: number): Variation {
  if (previous === 0) {
    const direction: VariationDirection = current === 0 ? 'flat' : 'up';
    return { pct: 0, direction };
  }
  const pct = ((current - previous) / previous) * 100;
  const direction = pickDirection(pct);
  return { pct, direction };
}

function pickDirection(pct: number): VariationDirection {
  if (Math.abs(pct) < FLAT_THRESHOLD_PCT) return 'flat';
  return pct > 0 ? 'up' : 'down';
}

export function calcRecurringRate(uniqueTotal: number, uniqueRecurring: number): number {
  if (uniqueTotal === 0) return 0;
  return uniqueRecurring / uniqueTotal;
}
