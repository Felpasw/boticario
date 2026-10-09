import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UsersRepository } from '../../../users/domain/ports/users-repository.js';
import { InvalidCredentialsError } from '../../domain/errors/invalid-credentials.error.js';
import type { PasswordHasher } from '../../domain/ports/password-hasher.js';
import type { SessionsRepository } from '../../domain/ports/sessions-repository.js';
import { LoginWithPasswordUseCase } from './login-with-password.use-case.js';

function createDeps() {
  const users: UsersRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByEmailWithPassword: vi.fn(),
  };
  const sessions: SessionsRepository = {
    create: vi.fn().mockImplementation(async (input) => ({ ...input, createdAt: new Date() })),
    findActiveById: vi.fn(),
    deleteById: vi.fn(),
    renewExpiration: vi.fn(),
  };
  const hasher: PasswordHasher = {
    hash: vi.fn(),
    verify: vi.fn(),
  };
  return { users, sessions, hasher };
}

describe('LoginWithPasswordUseCase', () => {
  let deps: ReturnType<typeof createDeps>;
  let useCase: LoginWithPasswordUseCase;

  beforeEach(() => {
    deps = createDeps();
    useCase = new LoginWithPasswordUseCase(deps.users, deps.sessions, deps.hasher);
  });

  it('returns the user and session on correct credentials', async () => {
    vi.mocked(deps.users.findByEmailWithPassword).mockResolvedValue({
      id: 'user-1',
      email: 'admin@boticario.local',
      name: 'Admin',
      password: 'hashed',
    });
    vi.mocked(deps.hasher.verify).mockResolvedValue(true);

    const result = await useCase.execute({
      email: 'admin@boticario.local',
      password: 'secret',
    });

    expect(result.user).toEqual({ id: 'user-1', email: 'admin@boticario.local', name: 'Admin' });
    expect(result.sessionId).toHaveLength(64);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(deps.sessions.create).toHaveBeenCalledOnce();
  });

  it('throws InvalidCredentialsError when the email is not registered', async () => {
    vi.mocked(deps.users.findByEmailWithPassword).mockResolvedValue(null);
    vi.mocked(deps.hasher.verify).mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'nope@boticario.local', password: 'secret' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(deps.hasher.verify).toHaveBeenCalledOnce();
    expect(deps.sessions.create).not.toHaveBeenCalled();
  });

  it('throws InvalidCredentialsError when the password does not match', async () => {
    vi.mocked(deps.users.findByEmailWithPassword).mockResolvedValue({
      id: 'user-1',
      email: 'admin@boticario.local',
      name: 'Admin',
      password: 'hashed',
    });
    vi.mocked(deps.hasher.verify).mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'admin@boticario.local', password: 'wrong' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(deps.sessions.create).not.toHaveBeenCalled();
  });
});
