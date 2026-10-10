/* eslint-disable react-hooks/rules-of-hooks --
 * O lint bane hooks dentro de classe (assume "class component"), mas plain TS
 * class não é componente React. Chamada `authHooks.use()` acontece durante o
 * render em ordem estável, então Rules of Hooks (runtime) segue respeitada.
 * Regra: `use()` chama todos os hooks no topo em ordem fixa, sem `if`/loop.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import authService from '@/services/auth.service';
import type { LoginCredentials, LoginResponse } from '@/services/interfaces/auth.interface';
import { userStoreActions } from '@/stores/userStore';

import type { AuthHooksResult, IAuthHooks } from './interfaces/useAuth.interface';

export const AUTH_QUERY_KEYS = {
  all: ['auth'] as const,
  me: ['auth', 'me'] as const,
};

class AuthHooks implements IAuthHooks {
  use(opts?: { enableMeQuery?: boolean }): AuthHooksResult {
    const queryClient = useQueryClient();

    const login = useMutation<LoginResponse, unknown, LoginCredentials>({
      mutationFn: (credentials) => authService.login(credentials),
      onSuccess: (data) => userStoreActions.setUser(data.user),
    });

    const logout = useMutation<void, unknown, void>({
      mutationFn: () => authService.logout(),
      onSuccess: () => {
        userStoreActions.clear();
        queryClient.clear();
      },
    });

    const me = useQuery<LoginResponse, unknown>({
      queryKey: AUTH_QUERY_KEYS.me,
      queryFn: () => authService.me(),
      enabled: opts?.enableMeQuery ?? false,
    });

    return { login, logout, me };
  }
}

const authHooks = new AuthHooks();
export default authHooks;
