import { differenceInMilliseconds, isAfter, parseISO, subDays, subMilliseconds } from 'date-fns';

import { InvalidPeriodError } from '../errors/invalid-period.error.js';
import { PeriodTooLargeError } from '../errors/period-too-large.error.js';

const DEFAULT_PERIOD_DAYS = 30;
const MAX_PERIOD_DAYS = 365;
const MAX_PERIOD_MS = MAX_PERIOD_DAYS * 24 * 60 * 60 * 1000;

export interface PeriodInput {
  from?: string;
  to?: string;
}

export interface ResolvedPeriod {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
}

export function resolvePeriod(input: PeriodInput, now: Date = new Date()): ResolvedPeriod {
  const to = input.to ? parseISO(input.to) : now;
  const from = input.from ? parseISO(input.from) : subDays(to, DEFAULT_PERIOD_DAYS);

  if (isAfter(from, to)) {
    throw new InvalidPeriodError();
  }

  const windowMs = differenceInMilliseconds(to, from);
  if (windowMs > MAX_PERIOD_MS) {
    throw new PeriodTooLargeError(MAX_PERIOD_DAYS);
  }

  return {
    from,
    to,
    prevFrom: subMilliseconds(from, windowMs),
    prevTo: from,
  };
}
