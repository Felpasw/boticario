import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import type { LoginCredentials, LoginResponse } from '@/services/interfaces/auth.interface';

export interface AuthHooksResult {
  login: UseMutationResult<LoginResponse, unknown, LoginCredentials>;
  logout: UseMutationResult<void, unknown, void>;
  me: UseQueryResult<LoginResponse, unknown>;
}

export interface IAuthHooks {
  use(opts?: { enableMeQuery?: boolean }): AuthHooksResult;
}
