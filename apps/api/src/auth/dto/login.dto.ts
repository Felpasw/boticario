import type { LoginRequest } from 'shared';

export class LoginDto implements LoginRequest {
  email!: string;
  password!: string;
}
