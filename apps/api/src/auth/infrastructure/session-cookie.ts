import type { CookieOptions } from 'express';

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
