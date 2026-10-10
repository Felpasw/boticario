import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type {
  ConnectionRow,
  ConnectionsRepository,
  CreateConnectionInput,
  ListConnectionsArgs,
} from '../../domain/ports/connections-repository.js';

const SELECT_COLUMNS = Prisma.sql`
  id,
  "deviceId",
  to_char("connectedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "connectedAt",
  to_char("disconnectedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "disconnectedAt",
  "durationSeconds"
`;

@Injectable()
export class PrismaConnectionsRepository implements ConnectionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdempotencyKey(key: string): Promise<ConnectionRow | null> {
    const rows = await this.prisma.$queryRaw<ConnectionRow[]>(Prisma.sql`
      SELECT ${SELECT_COLUMNS} FROM "Connection" WHERE "idempotencyKey" = ${key} LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async create(input: CreateConnectionInput): Promise<ConnectionRow> {
    const rows = await this.prisma.$queryRaw<ConnectionRow[]>(Prisma.sql`
      INSERT INTO "Connection" ("id", "userId", "deviceId", "connectedAt", "disconnectedAt", "durationSeconds", "idempotencyKey")
      VALUES (gen_random_uuid(), ${input.userId}, ${input.deviceId}, ${input.connectedAt}, ${input.disconnectedAt}, ${input.durationSeconds}, ${input.idempotencyKey})
      RETURNING ${SELECT_COLUMNS}
    `);
    return rows[0];
  }

  listByUserInRange({
    userId,
    from,
    to,
    page,
    perPage,
  }: ListConnectionsArgs): Promise<ConnectionRow[]> {
    return this.prisma.$queryRaw<ConnectionRow[]>(Prisma.sql`
      SELECT ${SELECT_COLUMNS} FROM "Connection"
      WHERE "userId" = ${userId} AND "connectedAt" BETWEEN ${from} AND ${to}
      ORDER BY "connectedAt" DESC
      LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
    `);
  }

  countByUserInRange({
    userId,
    from,
    to,
  }: Omit<ListConnectionsArgs, 'page' | 'perPage'>): Promise<number> {
    return this.prisma.connection.count({
      where: { userId, connectedAt: { gte: from, lte: to } },
    });
  }
}
