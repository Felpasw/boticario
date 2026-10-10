import type { TopRecurringQuery } from 'shared';

export class TopRecurringQueryDto implements TopRecurringQuery {
  from?: string;
  to?: string;
  limit!: number;
}
