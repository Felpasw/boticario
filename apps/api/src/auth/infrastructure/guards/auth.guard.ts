import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../../users/domain/ports/users-repository.js';
import {
  SESSIONS_REPOSITORY,
  type SessionsRepository,
} from '../../domain/ports/sessions-repository.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { getCookieOptions, SESSION_COOKIE_NAME } from '../session-cookie.js';
import type { AuthenticatedUser } from '../types/authenticated-request.js';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_RENEW_THRESHOLD_MS = 24 * 60 * 60 * 1000;

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(SESSIONS_REPOSITORY) private readonly sessions: SessionsRepository,
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    const sessionId = this.readSessionCookie(request);
    if (!sessionId) {
      throw new UnauthorizedException('Session cookie is missing');
    }

    const now = new Date();
    const session = await this.sessions.findActiveById(sessionId, now);
    if (!session) {
      response.clearCookie(SESSION_COOKIE_NAME, getCookieOptions({ maxAgeMs: 0 }));
      throw new UnauthorizedException('Session expired or invalid');
    }

    const user = await this.users.findById(session.userId);
    if (!user) {
      await this.sessions.deleteById(session.id);
      response.clearCookie(SESSION_COOKIE_NAME, getCookieOptions({ maxAgeMs: 0 }));
      throw new UnauthorizedException('Session owner no longer exists');
    }

    if (session.expiresAt.getTime() - now.getTime() < SESSION_RENEW_THRESHOLD_MS) {
      const renewedExpiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
      await this.sessions.renewExpiration(session.id, renewedExpiresAt);
      response.cookie(
        SESSION_COOKIE_NAME,
        session.id,
        getCookieOptions({ maxAgeMs: SESSION_DURATION_MS }),
      );
    }

    request.user = { id: user.id, email: user.email, name: user.name };
    return true;
  }

  private readSessionCookie(request: Request): string | undefined {
    const cookies = (request as Request & { cookies?: Record<string, string> }).cookies;
    const value: unknown = cookies?.[SESSION_COOKIE_NAME];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
