import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';
import { addMinutes, addSeconds, startOfDay, subDays } from 'date-fns';

import { buildIdempotencyKey } from '../src/connections/domain/services/idempotency-key-builder.js';
import { hashMac } from '../src/connections/domain/services/mac-hasher.js';

const prisma = new PrismaClient();

const WEEKS = 8;
const DAYS = WEEKS * 7;
const BASE_VISITS_PER_DAY = 90;
const RECURRING_POOL_SIZE = 55;
const RECURRING_RATIO = 0.35;
const OUTLIER_RATIO = 0.02;
const DWELL_MEAN_SECONDS = 900;
const DWELL_SIGMA = 0.6;
const DWELL_CAP_SECONDS = 3600;
const OUTLIER_MIN_SECONDS = 7200;
const OUTLIER_MAX_SECONDS = 25200;

const WEEKDAY_MULTIPLIER: Record<number, number> = {
  0: 0.7,
  1: 1.0,
  2: 1.0,
  3: 1.0,
  4: 1.05,
  5: 1.1,
  6: 1.4,
};

const HOURLY_WEIGHTS: number[] = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.8, 1.0, 1.6, 1.6, 1.0, 0.9, 1.0, 1.5, 1.6, 1.2, 0.8, 0.5, 0, 0,
];

async function main(): Promise<void> {
  faker.seed(42);

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@boticario.local';
  const macSecret = process.env.MAC_HASH_SECRET;
  if (!macSecret) throw new Error('MAC_HASH_SECRET is required to seed connections');

  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) throw new Error(`admin user ${adminEmail} not seeded; run db:seed first`);

  const recurringPool = Array.from({ length: RECURRING_POOL_SIZE }, () => faker.internet.mac());
  const today = startOfDay(new Date());

  let totalInserted = 0;
  let totalSkipped = 0;

  for (let d = DAYS - 1; d >= 0; d -= 1) {
    const day = subDays(today, d);
    const weekdayMultiplier = WEEKDAY_MULTIPLIER[day.getDay()] ?? 1;
    const visitsToday = Math.round(BASE_VISITS_PER_DAY * weekdayMultiplier);

    for (let v = 0; v < visitsToday; v += 1) {
      const hour = pickHour();
      const minute = faker.number.int({ min: 0, max: 59 });
      const connectedAt = addMinutes(day, hour * 60 + minute);
      const mac =
        faker.number.float({ min: 0, max: 1 }) < RECURRING_RATIO
          ? faker.helpers.arrayElement(recurringPool)
          : faker.internet.mac();

      const macHash = hashMac(mac, macSecret);
      const idempotencyKey = buildIdempotencyKey({ userId: admin.id, macHash, connectedAt });

      const already = await prisma.connection.findUnique({ where: { idempotencyKey } });
      if (already) {
        totalSkipped += 1;
        continue;
      }

      const durationSeconds = pickDwellSeconds();
      const disconnectedAt = addSeconds(connectedAt, durationSeconds);

      const device = await prisma.device.upsert({
        where: { userId_macHash: { userId: admin.id, macHash } },
        create: {
          userId: admin.id,
          macHash,
          firstSeenAt: connectedAt,
          lastSeenAt: connectedAt,
        },
        update: { lastSeenAt: connectedAt },
      });

      await prisma.connection.create({
        data: {
          userId: admin.id,
          deviceId: device.id,
          connectedAt,
          disconnectedAt,
          durationSeconds,
          idempotencyKey,
        },
      });
      totalInserted += 1;
    }
  }

  console.log(`[seed:connections] inserted=${totalInserted} skipped=${totalSkipped} over ${DAYS}d`);
}

function pickHour(): number {
  const weights = HOURLY_WEIGHTS;
  const total = weights.reduce((acc, w) => acc + w, 0);
  const target = faker.number.float({ min: 0, max: total });
  let cumulative = 0;
  for (let hour = 0; hour < weights.length; hour += 1) {
    cumulative += weights[hour];
    if (target < cumulative) return hour;
  }
  for (let hour = weights.length - 1; hour >= 0; hour -= 1) {
    if (weights[hour] > 0) return hour;
  }
  return 0;
}

function pickDwellSeconds(): number {
  if (faker.number.float({ min: 0, max: 1 }) < OUTLIER_RATIO) {
    return faker.number.int({ min: OUTLIER_MIN_SECONDS, max: OUTLIER_MAX_SECONDS });
  }
  const u1 = Math.max(faker.number.float({ min: 0, max: 1 }), Number.EPSILON);
  const u2 = faker.number.float({ min: 0, max: 1 });
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const seconds = Math.exp(Math.log(DWELL_MEAN_SECONDS) + DWELL_SIGMA * normal);
  return Math.min(DWELL_CAP_SECONDS, Math.max(30, Math.round(seconds)));
}

main()
  .catch((error) => {
    console.error('[seed:connections] failed', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
