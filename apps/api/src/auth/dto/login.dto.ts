import { ApiProperty } from '@nestjs/swagger';
import type { LoginRequest } from 'shared';

export class LoginDto implements LoginRequest {
  @ApiProperty({ example: 'admin@boticario.local', format: 'email' })
  email!: string;

  @ApiProperty({ example: 'change-me-dev', minLength: 8 })
  password!: string;
}
