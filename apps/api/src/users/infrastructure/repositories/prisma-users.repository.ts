import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { EmailAlreadyRegisteredError } from '../../domain/errors/email-already-registered.error.js';
import type {
  CreateUserInput,
  UserSnapshot,
  UsersRepository,
  UserWithPassword,
} from '../../domain/ports/users-repository.js';

const UNIQUE_CONSTRAINT_CODE = 'P2002';

const USER_SNAPSHOT_SELECT = {
  id: true,
  email: true,
  name: true,
} as const;

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserInput): Promise<UserSnapshot> {
    try {
      return await this.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          password: input.password,
        },
        select: USER_SNAPSHOT_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_CODE
      ) {
        throw new EmailAlreadyRegisteredError(input.email);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<UserSnapshot | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: USER_SNAPSHOT_SELECT,
    });
  }

  async findByEmail(email: string): Promise<UserSnapshot | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: USER_SNAPSHOT_SELECT,
    });
  }

  async findByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { ...USER_SNAPSHOT_SELECT, password: true },
    });
  }
}
