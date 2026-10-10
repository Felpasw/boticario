import { ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../types/authenticated-request.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    if (!request.user) {
      throw new UnauthorizedException('Session cookie is missing');
    }
    return request.user;
  },
);
