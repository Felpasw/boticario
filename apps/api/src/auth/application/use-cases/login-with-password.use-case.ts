import { Inject, Injectable } from '@nestjs/common';

import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../../users/domain/ports/users-repository.js';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error.js';
import { PASSWORD_HASHER, type PasswordHasher } from '../../domain/ports/password-hasher.js';
import {
  SESSIONS_REPOSITORY,
  type SessionsRepository,
} from '../../domain/ports/sessions-repository.js';
import { generateSessionId } from '../../domain/services/session-id-generator.js';

const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$ZHVtbXl2YWx1ZXp6enp6enp6eg$Mn4LfBe/kRz9j7Lx9W5pBvQnG9NmTD7Yvm3fF5XbRe4';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export interface LoginWithPasswordInput {
  email: string;
  password: string;
}

export interface LoginWithPasswordResult {
  user: { id: string; email: string; name: string };
  sessionId: string;
  expiresAt: Date;
}

@Injectable()
export class LoginWithPasswordUseCase {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(SESSIONS_REPOSITORY) private readonly sessions: SessionsRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: LoginWithPasswordInput): Promise<LoginWithPasswordResult> {
    const user = await this.users.findByEmailWithPassword(input.email);

    if (!user) {
      await this.hasher.verify(DUMMY_HASH, input.password);
      throw new InvalidCredentialsError();
    }

    const matches = await this.hasher.verify(user.password, input.password);
    if (!matches) {
      throw new InvalidCredentialsError();
    }

    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await this.sessions.create({ id: sessionId, userId: user.id, expiresAt });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      sessionId,
      expiresAt,
    };
  }
}
