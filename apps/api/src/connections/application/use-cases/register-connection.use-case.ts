import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { differenceInSeconds, parseISO } from 'date-fns';
import type { RegisterConnectionResponse } from 'shared';

import { DisconnectedBeforeConnectedError } from '../../domain/errors/disconnected-before-connected.error.js';
import {
  CONNECTIONS_REPOSITORY,
  type ConnectionsRepository,
} from '../../domain/ports/connections-repository.js';
import {
  DEVICES_REPOSITORY,
  type DevicesRepository,
} from '../../domain/ports/devices-repository.js';
import { buildIdempotencyKey } from '../../domain/services/idempotency-key-builder.js';
import { hashMac } from '../../domain/services/mac-hasher.js';
import type { RegisterConnectionInput } from './types/register-connection.input.js';

@Injectable()
export class RegisterConnectionUseCase {
  private readonly macSecret: string;

  constructor(
    @Inject(DEVICES_REPOSITORY) private readonly devices: DevicesRepository,
    @Inject(CONNECTIONS_REPOSITORY) private readonly connections: ConnectionsRepository,
    config: ConfigService,
  ) {
    this.macSecret = config.getOrThrow<string>('MAC_HASH_SECRET');
  }

  async execute(input: RegisterConnectionInput): Promise<RegisterConnectionResponse> {
    const connectedAt = parseISO(input.connectedAt);
    const disconnectedAt = input.disconnectedAt ? parseISO(input.disconnectedAt) : null;

    if (disconnectedAt && disconnectedAt < connectedAt) {
      throw new DisconnectedBeforeConnectedError();
    }

    const macHash = hashMac(input.macAddress, this.macSecret);
    const idempotencyKey =
      input.idempotencyKey ?? buildIdempotencyKey({ userId: input.user.id, macHash, connectedAt });

    const existing = await this.connections.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return { created: false, connection: existing };
    }

    const device = await this.devices.upsertByUserAndMacHash({
      userId: input.user.id,
      macHash,
      seenAt: connectedAt,
    });

    const durationSeconds = disconnectedAt
      ? differenceInSeconds(disconnectedAt, connectedAt)
      : null;

    const created = await this.connections.create({
      userId: input.user.id,
      deviceId: device.id,
      connectedAt,
      disconnectedAt,
      durationSeconds,
      idempotencyKey,
    });

    return { created: true, connection: created };
  }
}
