import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

import type { PasswordHasher } from '../domain/ports/password-hasher.js';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async verify(hashed: string, plain: string): Promise<boolean> {
    return argon2.verify(hashed, plain);
  }
}
