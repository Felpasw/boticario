/* eslint-disable react-hooks/rules-of-hooks */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ConnectionsListResponse, RegisterConnectionResponse } from 'shared';

import connectionsService from '@/services/connections.service';
import type {
  ConnectionsListParams,
  RegisterConnectionArgs,
} from '@/services/interfaces/connections.interface';

import type {
  ConnectionsHooksResult,
  IConnectionsHooks,
} from './interfaces/useConnections.interface';
import { CONNECTIONS_QUERY_KEYS } from './queryKeys';

class ConnectionsHooks implements IConnectionsHooks {
  use(params?: ConnectionsListParams): ConnectionsHooksResult {
    const queryClient = useQueryClient();

    const list = useQuery<ConnectionsListResponse, unknown>({
      queryKey: CONNECTIONS_QUERY_KEYS.list(params),
      queryFn: () => connectionsService.list(params),
    });

    const register = useMutation<RegisterConnectionResponse, unknown, RegisterConnectionArgs>({
      mutationFn: (args) => connectionsService.register(args),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEYS.all }),
    });

    return { list, register };
  }
}

const connectionsHooks = new ConnectionsHooks();
export default connectionsHooks;
