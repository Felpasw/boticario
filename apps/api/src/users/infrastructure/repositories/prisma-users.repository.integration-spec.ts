import { randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { EmailAlreadyRegisteredError } from '../../domain/errors/email-already-registered.error.js';
import { PrismaUsersRepository } from './prisma-users.repository.js';

const prisma = new PrismaClient();
const repository = new PrismaUsersRepository(prisma as never);

const EMAIL_PREFIX = 'integration-repo-user-';

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
}

describe('PrismaUsersRepository', () => {
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

  it('creates a user and returns a snapshot without the password', async () => {
    const email = `${EMAIL_PREFIX}${randomUUID()}@example.com`;

    const snapshot = await repository.create({
      email,
      name: 'Repo User',
      password: 'hashed-value',
    });

    expect(snapshot.id).toEqual(expect.any(String));
    expect(snapshot.email).toBe(email);
    expect(snapshot.name).toBe('Repo User');
    expect(snapshot).not.toHaveProperty('password');
  });

  it('throws EmailAlreadyRegisteredError on duplicate email', async () => {
    const email = `${EMAIL_PREFIX}${randomUUID()}@example.com`;

    await repository.create({ email, name: 'First', password: 'h' });

    await expect(
      repository.create({ email, name: 'Second', password: 'h' }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
  });

  it('finds a user by id and by email', async () => {
    const email = `${EMAIL_PREFIX}${randomUUID()}@example.com`;
    const created = await repository.create({ email, name: 'Lookup', password: 'h' });

    const byId = await repository.findById(created.id);
    const byEmail = await repository.findByEmail(email);

    expect(byId?.id).toBe(created.id);
    expect(byEmail?.id).toBe(created.id);
  });

  it('returns null when the user does not exist', async () => {
    expect(await repository.findById(randomUUID())).toBeNull();
    expect(await repository.findByEmail(`${EMAIL_PREFIX}missing@example.com`)).toBeNull();
  });

  it('exposes the password when queried with findByEmailWithPassword', async () => {
    const email = `${EMAIL_PREFIX}${randomUUID()}@example.com`;
    await repository.create({ email, name: 'WithPassword', password: 'hashed-value' });

    const found = await repository.findByEmailWithPassword(email);

    expect(found?.email).toBe(email);
    expect(found?.password).toBe('hashed-value');
  });
});
