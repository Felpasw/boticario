import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module.js';
import { LoginWithPasswordUseCase } from './application/use-cases/login-with-password.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout.use-case.js';
import { AuthController } from './auth.controller.js';
import { PASSWORD_HASHER } from './domain/ports/password-hasher.js';
import { SESSIONS_REPOSITORY } from './domain/ports/sessions-repository.js';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher.js';
import { PrismaSessionsRepository } from './infrastructure/repositories/prisma-sessions.repository.js';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    LoginWithPasswordUseCase,
    LogoutUseCase,
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: SESSIONS_REPOSITORY, useClass: PrismaSessionsRepository },
  ],
  exports: [SESSIONS_REPOSITORY, PASSWORD_HASHER],
})
export class AuthModule {}
