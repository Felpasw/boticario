import type { ConnectionsQuery } from 'shared';

export class ConnectionsQueryDto implements ConnectionsQuery {
  from?: string;
  to?: string;
  page!: number;
  perPage!: number;
}
