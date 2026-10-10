import type { AuthenticatedUser } from '../../../../auth/infrastructure/types/authenticated-request.js';

export interface GetTopRecurringInput {
  user: Pick<AuthenticatedUser, 'id'>;
  from?: string;
  to?: string;
  limit: number;
}
