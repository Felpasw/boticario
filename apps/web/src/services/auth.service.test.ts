import { afterEach, describe, expect, it, vi } from 'vitest';

import api from '@/api';

import authService from './auth.service';

vi.mock('@/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  post: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

const ADMIN_RESPONSE = {
  user: {
    id: '7f1c2d8b-5e46-4c6d-9c6e-3c3f9b7a1e2a',
    email: 'admin@boticario.local',
    name: 'Admin',
  },
};

describe('AuthService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('login posts to /auth/login and returns the user payload', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: ADMIN_RESPONSE });

    const result = await authService.login({ email: 'admin@boticario.local', password: 'secret' });

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@boticario.local',
      password: 'secret',
    });
    expect(result).toEqual(ADMIN_RESPONSE);
  });

  it('logout posts to /auth/logout with an empty body', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: undefined });

    await authService.logout();

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/logout', {});
  });

  it('me gets /auth/me and returns the user payload', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: ADMIN_RESPONSE });

    const result = await authService.me();

    expect(mockedApi.get).toHaveBeenCalledWith('/auth/me');
    expect(result).toEqual(ADMIN_RESPONSE);
  });
});
