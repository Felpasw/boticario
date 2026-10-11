import type {
  ConnectionsListResponse,
  ConnectionsQuery,
  RegisterConnectionRequest,
  RegisterConnectionResponse,
} from 'shared';

export type ConnectionsListParams = Partial<ConnectionsQuery>;

export interface RegisterConnectionArgs {
  payload: RegisterConnectionRequest;
  idempotencyKey?: string;
}

export interface IConnectionsService {
  list(params?: ConnectionsListParams): Promise<ConnectionsListResponse>;
  register(args: RegisterConnectionArgs): Promise<RegisterConnectionResponse>;
}
