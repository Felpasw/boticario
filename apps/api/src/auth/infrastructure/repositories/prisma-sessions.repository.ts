import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type {
  CreateSessionInput,
  SessionSnapshot,
  SessionsRepository,
} from '../../domain/ports/sessions-repository.js';

@Injectable()
export class PrismaSessionsRepository implements SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateSessionInput): Promise<SessionSnapshot> {
    return this.prisma.session.create({
      data: {
        id: input.id,
        userId: input.userId,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findActiveById(id: string, now: Date): Promise<SessionSnapshot | null> {
    return this.prisma.session.findFirst({
      where: { id, expiresAt: { gt: now } },
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id } });
  }

  async renewExpiration(id: string, expiresAt: Date): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { expiresAt },
    });
  }
}
