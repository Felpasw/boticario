import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UsersRepository } from '../../../users/domain/ports/users-repository.js';
import type { SessionsRepository } from '../../domain/ports/sessions-repository.js';
import { AuthGuard } from './auth.guard.js';

function buildContext(cookies: Record<string, string> = {}): {
  context: ExecutionContext;
  response: { cookie: ReturnType<typeof vi.fn>; clearCookie: ReturnType<typeof vi.fn> };
  request: Record<string, unknown>;
} {
  const response = { cookie: vi.fn(), clearCookie: vi.fn() };
  const request: Record<string, unknown> = { cookies };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
  return { context, response, request };
}

function createDeps() {
  const reflector = { getAllAndOverride: vi.fn() } as unknown as Reflector;
  const sessions: SessionsRepository = {
    create: vi.fn(),
    findActiveById: vi.fn(),
    deleteById: vi.fn(),
    renewExpiration: vi.fn(),
  };
  const users: UsersRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByEmailWithPassword: vi.fn(),
  };
  return { reflector, sessions, users };
}

describe('AuthGuard', () => {
  let deps: ReturnType<typeof createDeps>;
  let guard: AuthGuard;

  beforeEach(() => {
    deps = createDeps();
    guard = new AuthGuard(deps.reflector, deps.sessions, deps.users);
  });

  it('lets public routes through without touching the cookie', async () => {
    vi.mocked(deps.reflector.getAllAndOverride).mockReturnValue(true);
    const { context } = buildContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(deps.sessions.findActiveById).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when the cookie is missing', async () => {
    vi.mocked(deps.reflector.getAllAndOverride).mockReturnValue(false);
    const { context } = buildContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws and clears the cookie when the session is expired/unknown', async () => {
    vi.mocked(deps.reflector.getAllAndOverride).mockReturnValue(false);
    vi.mocked(deps.sessions.findActiveById).mockResolvedValue(null);
    const { context, response } = buildContext({ boticario_session: 'abc' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(response.clearCookie).toHaveBeenCalled();
  });

  it('attaches the user and skips renewal when far from expiration', async () => {
    vi.mocked(deps.reflector.getAllAndOverride).mockReturnValue(false);
    vi.mocked(deps.sessions.findActiveById).mockResolvedValue({
      id: 'abc',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });
    vi.mocked(deps.users.findById).mockResolvedValue({
      id: 'user-1',
      email: 'admin@boticario.local',
      name: 'Admin',
    });
    const { context, request, response } = buildContext({ boticario_session: 'abc' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-1', email: 'admin@boticario.local', name: 'Admin' });
    expect(deps.sessions.renewExpiration).not.toHaveBeenCalled();
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('renews the session when expiration is within the threshold', async () => {
    vi.mocked(deps.reflector.getAllAndOverride).mockReturnValue(false);
    vi.mocked(deps.sessions.findActiveById).mockResolvedValue({
      id: 'abc',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
    });
    vi.mocked(deps.users.findById).mockResolvedValue({
      id: 'user-1',
      email: 'admin@boticario.local',
      name: 'Admin',
    });
    const { context, response } = buildContext({ boticario_session: 'abc' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(deps.sessions.renewExpiration).toHaveBeenCalledOnce();
    expect(response.cookie).toHaveBeenCalledOnce();
  });

  it('rejects when the session user vanished mid-flight', async () => {
    vi.mocked(deps.reflector.getAllAndOverride).mockReturnValue(false);
    vi.mocked(deps.sessions.findActiveById).mockResolvedValue({
      id: 'abc',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
    });
    vi.mocked(deps.users.findById).mockResolvedValue(null);
    const { context, response } = buildContext({ boticario_session: 'abc' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(deps.sessions.deleteById).toHaveBeenCalledWith('abc');
    expect(response.clearCookie).toHaveBeenCalled();
  });
});
