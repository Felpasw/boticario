import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module.js';
import { ListConnectionsUseCase } from './application/use-cases/list-connections.use-case.js';
import { RegisterConnectionUseCase } from './application/use-cases/register-connection.use-case.js';
import { ConnectionsController } from './connections.controller.js';
import { CONNECTIONS_REPOSITORY } from './domain/ports/connections-repository.js';
import { DEVICES_REPOSITORY } from './domain/ports/devices-repository.js';
import { IngestKeyGuard } from './infrastructure/guards/ingest-key.guard.js';
import { PrismaConnectionsRepository } from './infrastructure/repositories/prisma-connections.repository.js';
import { PrismaDevicesRepository } from './infrastructure/repositories/prisma-devices.repository.js';

@Module({
  imports: [UsersModule],
  controllers: [ConnectionsController],
  providers: [
    RegisterConnectionUseCase,
    ListConnectionsUseCase,
    IngestKeyGuard,
    { provide: DEVICES_REPOSITORY, useClass: PrismaDevicesRepository },
    { provide: CONNECTIONS_REPOSITORY, useClass: PrismaConnectionsRepository },
  ],
})
export class ConnectionsModule {}
