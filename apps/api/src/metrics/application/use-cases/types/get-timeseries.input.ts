import type { AuthenticatedUser } from '../../../../auth/infrastructure/types/authenticated-request.js';

export interface GetTimeseriesInput {
  user: Pick<AuthenticatedUser, 'id'>;
  from?: string;
  to?: string;
  granularity?: 'day' | 'week';
}
