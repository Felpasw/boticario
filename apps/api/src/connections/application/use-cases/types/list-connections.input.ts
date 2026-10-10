import type { AuthenticatedUser } from '../../../../auth/infrastructure/types/authenticated-request.js';

export interface ListConnectionsInput {
  user: Pick<AuthenticatedUser, 'id'>;
  from?: string;
  to?: string;
  page: number;
  perPage: number;
}
