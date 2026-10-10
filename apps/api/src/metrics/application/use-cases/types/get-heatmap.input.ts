import type { AuthenticatedUser } from '../../../../auth/infrastructure/types/authenticated-request.js';

export interface GetHeatmapInput {
  user: Pick<AuthenticatedUser, 'id'>;
  from?: string;
  to?: string;
}
