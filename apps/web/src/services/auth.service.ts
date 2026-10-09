import api from '@/api';

import type { IAuthService, LoginCredentials, LoginResponse } from './interfaces/auth.interface';

class AuthService implements IAuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials);
    return data;
  }

  async logout(): Promise<void> {
    await api.post('/auth/logout', {});
  }

  async me(): Promise<LoginResponse> {
    const { data } = await api.get<LoginResponse>('/auth/me');
    return data;
  }
}

const authService = new AuthService();
export default authService;
