import { Inject, Injectable } from '@nestjs/common';

import {
  SESSIONS_REPOSITORY,
  type SessionsRepository,
} from '../../domain/ports/sessions-repository.js';

@Injectable()
export class LogoutUseCase {
  constructor(@Inject(SESSIONS_REPOSITORY) private readonly sessions: SessionsRepository) {}

  async execute(sessionId: string | undefined): Promise<void> {
    if (!sessionId) {
      return;
    }
    await this.sessions.deleteById(sessionId);
  }
}
