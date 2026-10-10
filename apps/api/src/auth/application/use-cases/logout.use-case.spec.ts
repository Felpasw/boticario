import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionsRepository } from '../../domain/ports/sessions-repository.js';
import { LogoutUseCase } from './logout.use-case.js';

function createSessions(): SessionsRepository {
  return {
    create: vi.fn(),
    findActiveById: vi.fn(),
    deleteById: vi.fn(),
    renewExpiration: vi.fn(),
  };
}

describe('LogoutUseCase', () => {
  let sessions: SessionsRepository;
  let useCase: LogoutUseCase;

  beforeEach(() => {
    sessions = createSessions();
    useCase = new LogoutUseCase(sessions);
  });

  it('deletes the session when an id is provided', async () => {
    await useCase.execute('abc123');
    expect(sessions.deleteById).toHaveBeenCalledWith('abc123');
  });

  it('is a no-op when the session id is missing', async () => {
    await useCase.execute(undefined);
    expect(sessions.deleteById).not.toHaveBeenCalled();
  });
});
