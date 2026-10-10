import type { AuthenticatedUser } from '../../../../auth/infrastructure/types/authenticated-request.js';

export interface RegisterConnectionInput {
  user: Pick<AuthenticatedUser, 'id'>;
  macAddress: string;
  connectedAt: string;
  disconnectedAt?: string | null;
  idempotencyKey?: string;
}
