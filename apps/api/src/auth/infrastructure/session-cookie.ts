import type { CookieOptions, Request } from 'express';

export const SESSION_COOKIE_NAME = 'boticario_session';

export interface CookieOptionsInput {
  maxAgeMs: number;
}

export function getCookieOptions({ maxAgeMs }: CookieOptionsInput): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function readSessionCookie(request: Request): string | undefined {
  const cookies = (request as Request & { cookies?: Record<string, string> }).cookies;
  const value: unknown = cookies?.[SESSION_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
