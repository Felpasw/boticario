import type { RegisterConnectionRequest } from 'shared';

export class RegisterConnectionDto implements RegisterConnectionRequest {
  macAddress!: string;
  connectedAt!: string;
  disconnectedAt?: string | null;
}
