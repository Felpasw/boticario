import { Inject, Injectable } from '@nestjs/common';
import { parseISO, subDays } from 'date-fns';
import type { ConnectionsListResponse } from 'shared';

import {
  CONNECTIONS_REPOSITORY,
  type ConnectionsRepository,
} from '../../domain/ports/connections-repository.js';
import type { ListConnectionsInput } from './types/list-connections.input.js';

const DEFAULT_WINDOW_DAYS = 30;

@Injectable()
export class ListConnectionsUseCase {
  constructor(
    @Inject(CONNECTIONS_REPOSITORY) private readonly connections: ConnectionsRepository,
  ) {}

  async execute(input: ListConnectionsInput): Promise<ConnectionsListResponse> {
    const to = input.to ? parseISO(input.to) : new Date();
    const from = input.from ? parseISO(input.from) : subDays(to, DEFAULT_WINDOW_DAYS);
    const args = { userId: input.user.id, from, to };

    const [data, total] = await Promise.all([
      this.connections.listByUserInRange({ ...args, page: input.page, perPage: input.perPage }),
      this.connections.countByUserInRange(args),
    ]);

    return {
      data,
      page: input.page,
      perPage: input.perPage,
      total,
      totalPages: Math.ceil(total / input.perPage),
    };
  }
}
