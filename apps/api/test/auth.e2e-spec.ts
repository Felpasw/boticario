import { randomUUID } from 'node:crypto';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { Argon2PasswordHasher } from '../src/auth/infrastructure/argon2-password-hasher.js';
import { AppModule } from '../src/app.module.js';

const EMAIL_PREFIX = 'auth-e2e-user-';
const PASSWORD = 'Str0ng-Pass!';

const prisma = new PrismaClient();
const hasher = new Argon2PasswordHasher();

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
}

async function createAdmin() {
  const email = `${EMAIL_PREFIX}${randomUUID()}@example.com`;
  const password = await hasher.hash(PASSWORD);
  const user = await prisma.user.create({
    data: { email, name: 'Admin', password },
  });
  return { email, user };
}

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    await cleanup();
  });

  async function bootApp() {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
    return app.getHttpServer();
  }

  it('POST /auth/login returns 200 + cookie for valid credentials', async () => {
    const { email } = await createAdmin();
    const server = await bootApp();

    const response = await request(server)
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);

    expect(response.body).toEqual({ user: { id: expect.any(String), email, name: 'Admin' } });
    const setCookie = response.headers['set-cookie'];
    const cookieLine = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieLine).toContain('boticario_session=');
    expect(cookieLine).toContain('HttpOnly');
  });

  it('POST /auth/login returns 401 for an invalid password', async () => {
    const { email } = await createAdmin();
    const server = await bootApp();

    const response = await request(server)
      .post('/auth/login')
      .send({ email, password: 'wrong' })
      .expect(401);

    expect(response.body.error).toBe('INVALID_CREDENTIALS');
  });

  it('POST /auth/login returns 401 for an unknown email with the same envelope', async () => {
    const server = await bootApp();

    const response = await request(server)
      .post('/auth/login')
      .send({ email: `${EMAIL_PREFIX}nobody@example.com`, password: PASSWORD })
      .expect(401);

    expect(response.body.error).toBe('INVALID_CREDENTIALS');
  });

  it('POST /auth/login returns 400 for an invalid email payload', async () => {
    const server = await bootApp();

    const response = await request(server)
      .post('/auth/login')
      .send({ email: 'not-an-email', password: '' })
      .expect(400);

    expect(response.body.error).toBe('VALIDATION_ERROR');
  });

  it('GET /auth/me returns the current user when authenticated', async () => {
    const { email } = await createAdmin();
    const server = await bootApp();

    const login = await request(server)
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);

    const setCookie = login.headers['set-cookie'];
    const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie) as string;

    const me = await request(server).get('/auth/me').set('Cookie', cookie).expect(200);
    expect(me.body.user.email).toBe(email);
  });

  it('GET /auth/me returns 401 without a cookie', async () => {
    const server = await bootApp();

    const response = await request(server).get('/auth/me').expect(401);
    expect(response.body.error).toBe('UNAUTHORIZED');
  });

  it('POST /auth/logout clears the cookie and makes subsequent /auth/me 401', async () => {
    const { email } = await createAdmin();
    const server = await bootApp();

    const login = await request(server)
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);

    const setCookie = login.headers['set-cookie'];
    const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie) as string;

    await request(server).post('/auth/logout').set('Cookie', cookie).expect(204);

    await request(server).get('/auth/me').set('Cookie', cookie).expect(401);
  });

  it('GET /health keeps responding without a cookie (whitelisted)', async () => {
    const server = await bootApp();

    const response = await request(server).get('/health').expect(200);
    expect(response.body).toMatchObject({ status: 'ok', db: 'ok' });
  });
});
