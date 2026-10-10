import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UsePipes,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoginRequestSchema, type LoginResponse } from 'shared';

import { ZodValidationPipe } from '../@common/infrastructure/pipes/zod-validation.pipe.js';
import { LoginWithPasswordUseCase } from './application/use-cases/login-with-password.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout.use-case.js';
import { LoginDto } from './dto/login.dto.js';
import { CurrentUser } from './infrastructure/decorators/current-user.decorator.js';
import { Public } from './infrastructure/decorators/public.decorator.js';
import { SESSION_COOKIE_NAME, getCookieOptions } from './infrastructure/session-cookie.js';
import type { AuthenticatedUser } from './infrastructure/types/authenticated-request.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginWithPasswordUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(LoginRequestSchema))
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
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const sessionId = this.readSessionCookie(request);
    await this.logoutUseCase.execute(sessionId);
    response.clearCookie(SESSION_COOKIE_NAME, getCookieOptions({ maxAgeMs: 0 }));
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser | undefined): LoginResponse {
    if (!user) {
      throw new UnauthorizedException('Session cookie is missing');
    }
    return { user };
  }

  private readSessionCookie(request: Request): string | undefined {
    const cookies = (request as Request & { cookies?: Record<string, string> }).cookies;
    const value: unknown = cookies?.[SESSION_COOKIE_NAME];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
