import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

import { AllExceptionsFilter } from './@common/infrastructure/filters/all-exceptions.filter.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthGuard } from './auth/infrastructure/guards/auth.guard.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    HealthModule,
    MetricsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
