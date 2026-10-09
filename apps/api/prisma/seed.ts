import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@boticario.local';
  const password = await argon2.hash(process.env.SEED_ADMIN_PASSWORD ?? 'change-me-dev');
  const name = process.env.SEED_ADMIN_NAME ?? 'Admin';

  await prisma.user.upsert({
    where: { email },
    create: { email, name, password },
    update: {},
  });

  console.log(`[seed] admin ready: ${email}`);
}

main().finally(() => prisma.$disconnect());
