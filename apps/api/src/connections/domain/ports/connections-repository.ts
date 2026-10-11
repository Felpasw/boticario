import type { ConnectionView } from 'shared';

export const CONNECTIONS_REPOSITORY = Symbol('CONNECTIONS_REPOSITORY');

export type ConnectionRow = ConnectionView;

export interface CreateConnectionInput {
  userId: string;
  deviceId: string;
  connectedAt: Date;
  disconnectedAt: Date | null;
  durationSeconds: number | null;
  idempotencyKey: string;
}

export interface ListConnectionsArgs {
  userId: string;
  from: Date;
  to: Date;
  page: number;
  perPage: number;
}

export interface ConnectionsRepository {
  findByIdempotencyKey(key: string): Promise<ConnectionRow | null>;
  create(input: CreateConnectionInput): Promise<ConnectionRow>;
  listByUserInRange(args: ListConnectionsArgs): Promise<ConnectionRow[]>;
  countByUserInRange(args: Omit<ListConnectionsArgs, 'page' | 'perPage'>): Promise<number>;
}
