import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { LoginRequestSchema, type LoginResponse } from 'shared';

import { ZodValidationPipe } from '../@common/infrastructure/pipes/zod-validation.pipe.js';
import { LoginWithPasswordUseCase } from './application/use-cases/login-with-password.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout.use-case.js';
import { LoginDto } from './dto/login.dto.js';
import { CurrentUser } from './infrastructure/decorators/current-user.decorator.js';
import { Public } from './infrastructure/decorators/public.decorator.js';
import { SESSION_COOKIE_NAME, getCookieOptions } from './infrastructure/session-cookie.js';
import { INVALID_CREDENTIALS_EXAMPLE, LOGIN_SUCCESS_EXAMPLE } from './swagger-examples.js';
import type { AuthenticatedUser } from './infrastructure/types/authenticated-request.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginWithPasswordUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(LoginRequestSchema))
  @ApiOperation({
    summary: 'Authenticate with email and password',
    description:
      'Creates a session row in Postgres and sets the boticario_session HttpOnly cookie. Rate-limited at 10 req/min per IP to deter brute-force.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Credentials accepted; session cookie attached to the response.',
    schema: { example: LOGIN_SUCCESS_EXAMPLE },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials.',
    schema: { example: INVALID_CREDENTIALS_EXAMPLE },
  })
  @ApiTooManyRequestsResponse({ description: 'Rate limit reached (10 req/min per IP).' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const result = await this.loginUseCase.execute(dto);

    const maxAgeMs = result.expiresAt.getTime() - Date.now();
    response.cookie(SESSION_COOKIE_NAME, result.sessionId, getCookieOptions({ maxAgeMs }));

    return { user: result.user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Invalidate the current session',
    description: 'Deletes the session row from Postgres and clears the boticario_session cookie.',
  })
  @ApiResponse({ status: 204, description: 'Session invalidated.' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const sessionId = this.readSessionCookie(request);
    await this.logoutUseCase.execute(sessionId);
    response.clearCookie(SESSION_COOKIE_NAME, getCookieOptions({ maxAgeMs: 0 }));
  }

  @Get('me')
  @ApiCookieAuth('boticario_session')
  @ApiOperation({
    summary: 'Resolve the user owning the current session',
    description:
      'Reads the boticario_session cookie and returns the owner of the session. Used by the dashboard to decide whether to redirect to /login.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session is valid.',
    schema: { example: LOGIN_SUCCESS_EXAMPLE },
  })
  @ApiUnauthorizedResponse({ description: 'Session cookie missing, expired or revoked.' })
  me(@CurrentUser() user: AuthenticatedUser): LoginResponse {
    return { user };
  }

  private readSessionCookie(request: Request): string | undefined {
    const cookies = (request as Request & { cookies?: Record<string, string> }).cookies;
    const value: unknown = cookies?.[SESSION_COOKIE_NAME];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
