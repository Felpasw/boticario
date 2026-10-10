import { randomBytes, randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

const prisma = new PrismaClient();

const EMAIL_PREFIX = 'integration-user-';

async function cleanup() {
  await prisma.session.deleteMany({ where: { user: { email: { startsWith: EMAIL_PREFIX } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
}

describe('User + Session integration', () => {
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

  it('creates a user with unique email', async () => {
    const email = `${EMAIL_PREFIX}${randomUUID()}@example.com`;

    const created = await prisma.user.create({
      data: { email, name: 'Integration User', password: 'fake-hash' },
    });

    expect(created.id).toEqual(expect.any(String));
    expect(created.email).toBe(email);
    expect(created.createdAt).toBeInstanceOf(Date);
  });

  it('rejects duplicate emails', async () => {
    const email = `${EMAIL_PREFIX}${randomUUID()}@example.com`;

    await prisma.user.create({
      data: { email, name: 'First', password: 'h1' },
    });

    await expect(
      prisma.user.create({
        data: { email, name: 'Second', password: 'h2' },
      }),
    ).rejects.toThrow();
  });

  it('creates a session tied to a user and finds it back', async () => {
    const email = `${EMAIL_PREFIX}${randomUUID()}@example.com`;
    const user = await prisma.user.create({
      data: { email, name: 'With Session', password: 'h' },
    });

    const sessionId = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
      data: { id: sessionId, userId: user.id, expiresAt },
    });

    expect(session.id).toBe(sessionId);
    expect(session.userId).toBe(user.id);

    const found = await prisma.session.findUnique({ where: { id: sessionId } });
    expect(found).not.toBeNull();
    expect(found?.userId).toBe(user.id);
  });

  it('cascades deletes from user to sessions', async () => {
    const email = `${EMAIL_PREFIX}${randomUUID()}@example.com`;
    const user = await prisma.user.create({
      data: { email, name: 'Cascade', password: 'h' },
    });

    const sessionId = randomBytes(32).toString('hex');
    await prisma.session.create({
      data: { id: sessionId, userId: user.id, expiresAt: new Date(Date.now() + 60_000) },
    });

    await prisma.user.delete({ where: { id: user.id } });

    const stillThere = await prisma.session.findUnique({ where: { id: sessionId } });
    expect(stillThere).toBeNull();
  });
});
