import { describe, expect, it } from 'vitest';

import { AuthUserSchema, LoginRequestSchema, LoginResponseSchema } from './auth.js';

describe('LoginRequestSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = LoginRequestSchema.parse({
      email: 'admin@boticario.local',
      password: 'secret',
    });

    expect(parsed.email).toBe('admin@boticario.local');
    expect(parsed.password).toBe('secret');
  });

  it('rejects invalid emails', () => {
    expect(() => LoginRequestSchema.parse({ email: 'nope', password: 'x' })).toThrow();
  });

  it('rejects empty passwords', () => {
    expect(() =>
      LoginRequestSchema.parse({ email: 'admin@boticario.local', password: '' }),
    ).toThrow();
  });
});

describe('AuthUserSchema', () => {
  it('accepts a well-formed user', () => {
    const parsed = AuthUserSchema.parse({
      id: '7f1c2d8b-5e46-4c6d-9c6e-3c3f9b7a1e2a',
      email: 'admin@boticario.local',
      name: 'Admin',
    });

    expect(parsed.name).toBe('Admin');
  });

  it('rejects non-uuid ids', () => {
    expect(() => AuthUserSchema.parse({ id: 'not-a-uuid', email: 'a@b.com', name: 'x' })).toThrow();
  });
});

describe('LoginResponseSchema', () => {
  it('wraps an AuthUser', () => {
    const parsed = LoginResponseSchema.parse({
      user: {
        id: '7f1c2d8b-5e46-4c6d-9c6e-3c3f9b7a1e2a',
        email: 'admin@boticario.local',
        name: 'Admin',
      },
    });

    expect(parsed.user.email).toBe('admin@boticario.local');
  });

  it('rejects an empty object', () => {
    expect(() => LoginResponseSchema.parse({})).toThrow();
  });
});
