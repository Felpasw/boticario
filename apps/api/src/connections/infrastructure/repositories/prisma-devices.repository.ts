import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type {
  DeviceRow,
  DevicesRepository,
  UpsertDeviceInput,
} from '../../domain/ports/devices-repository.js';

@Injectable()
export class PrismaDevicesRepository implements DevicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertByUserAndMacHash({ userId, macHash, seenAt }: UpsertDeviceInput): Promise<DeviceRow> {
    const device = await this.prisma.device.upsert({
      where: { userId_macHash: { userId, macHash } },
      create: { userId, macHash, firstSeenAt: seenAt, lastSeenAt: seenAt },
      update: { lastSeenAt: seenAt },
    });
    return {
      id: device.id,
      userId: device.userId,
      macHash: device.macHash,
      firstSeenAt: device.firstSeenAt,
      lastSeenAt: device.lastSeenAt,
    };
  }
}
