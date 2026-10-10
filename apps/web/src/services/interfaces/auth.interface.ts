import type { AuthUser, LoginRequest, LoginResponse } from 'shared';

export type LoginCredentials = LoginRequest;
export type { AuthUser, LoginResponse };

export interface IAuthService {
  login(credentials: LoginCredentials): Promise<LoginResponse>;
  logout(): Promise<void>;
  me(): Promise<LoginResponse>;
}
