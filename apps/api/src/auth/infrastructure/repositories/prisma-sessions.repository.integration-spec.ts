import { randomBytes, randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { PrismaSessionsRepository } from './prisma-sessions.repository.js';

const prisma = new PrismaClient();
const repository = new PrismaSessionsRepository(prisma as never);

const EMAIL_PREFIX = 'integration-sessions-user-';

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
}

async function createUser() {
  return prisma.user.create({
    data: {
      email: `${EMAIL_PREFIX}${randomUUID()}@example.com`,
      name: 'Session Owner',
      password: 'h',
    },
  });
}

function sessionId() {
  return randomBytes(32).toString('hex');
}

describe('PrismaSessionsRepository', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await cleanup();
  });

  it('creates a session tied to a user', async () => {
    const user = await createUser();
    const id = sessionId();
    const expiresAt = new Date(Date.now() + 60_000);

    const session = await repository.create({ id, userId: user.id, expiresAt });

    expect(session.id).toBe(id);
    expect(session.userId).toBe(user.id);
    expect(session.expiresAt.getTime()).toBe(expiresAt.getTime());
  });

  it('findActiveById returns the session while it is in the future', async () => {
    const user = await createUser();
    const id = sessionId();
    await repository.create({ id, userId: user.id, expiresAt: new Date(Date.now() + 60_000) });

    const found = await repository.findActiveById(id, new Date());
    expect(found?.id).toBe(id);
  });

  it('findActiveById returns null for expired sessions', async () => {
    const user = await createUser();
    const id = sessionId();
    const expiresAt = new Date(Date.now() - 60_000);
    await repository.create({ id, userId: user.id, expiresAt });

    const found = await repository.findActiveById(id, new Date());
    expect(found).toBeNull();
  });

  it('deleteById is idempotent', async () => {
    const user = await createUser();
    const id = sessionId();
    await repository.create({ id, userId: user.id, expiresAt: new Date(Date.now() + 60_000) });

    await repository.deleteById(id);
    await repository.deleteById(id);

    expect(await repository.findActiveById(id, new Date())).toBeNull();
  });

  it('renewExpiration bumps the expiresAt field', async () => {
    const user = await createUser();
    const id = sessionId();
    const original = new Date(Date.now() + 60_000);
    await repository.create({ id, userId: user.id, expiresAt: original });

    const next = new Date(original.getTime() + 60 * 60 * 1000);
    await repository.renewExpiration(id, next);

    const found = await repository.findActiveById(id, new Date());
    expect(found?.expiresAt.getTime()).toBe(next.getTime());
  });
});
