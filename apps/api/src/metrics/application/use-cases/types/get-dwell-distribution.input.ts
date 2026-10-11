import type { AuthenticatedUser } from '../../../../auth/infrastructure/types/authenticated-request.js';

export interface GetDwellDistributionInput {
  user: Pick<AuthenticatedUser, 'id'>;
  from?: string;
  to?: string;
}
