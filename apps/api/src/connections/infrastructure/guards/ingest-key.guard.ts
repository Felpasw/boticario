import { timingSafeEqual } from 'node:crypto';

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../../../auth/infrastructure/types/authenticated-request.js';
import { UsersService } from '../../../users/users.service.js';

const INGEST_KEY_HEADER = 'x-ingest-key';

type IngestRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class IngestKeyGuard implements CanActivate {
  private readonly logger = new Logger(IngestKeyGuard.name);
  private readonly expectedKey: string;
  private readonly ownerEmail: string;

  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    this.expectedKey = config.getOrThrow<string>('INGEST_API_KEY');
    this.ownerEmail = config.getOrThrow<string>('INGEST_USER_EMAIL');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IngestRequest>();
    const providedKey = request.headers[INGEST_KEY_HEADER];

    if (typeof providedKey !== 'string' || !safeEqual(providedKey, this.expectedKey)) {
      throw new UnauthorizedException('invalid or missing X-Ingest-Key header');
    }

    const user = await this.users.findByEmail(this.ownerEmail);
    if (!user) {
      this.logger.error(`INGEST_USER_EMAIL=${this.ownerEmail} not found in database`);
      throw new UnauthorizedException('ingest owner not provisioned');
    }

    request.user = { id: user.id, email: user.email, name: user.name };
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
