import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { ConnectionsListResponse, RegisterConnectionResponse } from 'shared';

import type {
  ConnectionsListParams,
  RegisterConnectionArgs,
} from '@/services/interfaces/connections.interface';

export interface ConnectionsHooksResult {
  list: UseQueryResult<ConnectionsListResponse, unknown>;
  register: UseMutationResult<RegisterConnectionResponse, unknown, RegisterConnectionArgs>;
}

export interface IConnectionsHooks {
  use(params?: ConnectionsListParams): ConnectionsHooksResult;
}
