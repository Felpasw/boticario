import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import authService from '@/services/auth.service';
import { useUserStore, userStoreActions } from '@/stores/userStore';

import authHooks from './useAuth';

vi.mock('@/services/auth.service', () => ({
  default: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}));

const mockedService = authService as unknown as {
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  me: ReturnType<typeof vi.fn>;
};

const ADMIN = {
  id: '7f1c2d8b-5e46-4c6d-9c6e-3c3f9b7a1e2a',
  email: 'admin@boticario.local',
  name: 'Admin',
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('AuthHooks.use()', () => {
  beforeEach(() => {
    userStoreActions.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('populates the userStore after a successful login mutation', async () => {
    mockedService.login.mockResolvedValueOnce({ user: ADMIN });

    const { result } = renderHook(() => authHooks.use(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.login.mutateAsync({ email: ADMIN.email, password: 'secret' });
    });

    await waitFor(() => expect(useUserStore.getState().user).toEqual(ADMIN));
  });

  it('clears the userStore after a successful logout mutation', async () => {
    userStoreActions.setUser(ADMIN);
    mockedService.logout.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => authHooks.use(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.logout.mutateAsync();
    });

    await waitFor(() => expect(useUserStore.getState().user).toBeNull());
  });
});
