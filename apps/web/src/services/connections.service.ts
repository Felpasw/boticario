import type { ConnectionsListResponse, RegisterConnectionResponse } from 'shared';

import api from '@/api';

import type {
  ConnectionsListParams,
  IConnectionsService,
  RegisterConnectionArgs,
} from './interfaces/connections.interface';

class ConnectionsService implements IConnectionsService {
  async list(params?: ConnectionsListParams): Promise<ConnectionsListResponse> {
    const { data } = await api.get<ConnectionsListResponse>('/connections', { params });
    return data;
  }

  async register({ payload, idempotencyKey }: RegisterConnectionArgs): Promise<RegisterConnectionResponse> {
    const { data } = await api.post<RegisterConnectionResponse>('/connections', payload, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return data;
  }
}

const connectionsService = new ConnectionsService();
export default connectionsService;
