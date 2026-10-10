import { Module } from '@nestjs/common';

import { USERS_REPOSITORY } from './domain/ports/users-repository.js';
import { PrismaUsersRepository } from './infrastructure/repositories/prisma-users.repository.js';
import { UsersService } from './users.service.js';

@Module({
  providers: [UsersService, { provide: USERS_REPOSITORY, useClass: PrismaUsersRepository }],
  exports: [UsersService, USERS_REPOSITORY],
})
export class UsersModule {}
