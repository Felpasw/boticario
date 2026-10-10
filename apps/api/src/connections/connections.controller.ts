import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ConnectionsQuerySchema,
  type ConnectionsListResponse,
  RegisterConnectionRequestSchema,
  type RegisterConnectionResponse,
} from 'shared';

import { ZodValidationPipe } from '../@common/infrastructure/pipes/zod-validation.pipe.js';
import { CurrentUser } from '../auth/infrastructure/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/infrastructure/types/authenticated-request.js';
import { ListConnectionsUseCase } from './application/use-cases/list-connections.use-case.js';
import { RegisterConnectionUseCase } from './application/use-cases/register-connection.use-case.js';
import { ConnectionsQueryDto } from './dto/connections-query.dto.js';
import { RegisterConnectionDto } from './dto/register-connection.dto.js';

@Controller('connections')
export class ConnectionsController {
  constructor(
    private readonly registerConnection: RegisterConnectionUseCase,
    private readonly listConnections: ListConnectionsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodValidationPipe(RegisterConnectionRequestSchema))
    dto: RegisterConnectionDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RegisterConnectionResponse> {
    const result = await this.registerConnection.execute({
      user,
      macAddress: dto.macAddress,
      connectedAt: dto.connectedAt,
      disconnectedAt: dto.disconnectedAt,
      idempotencyKey,
    });

    if (!result.created) {
      response.status(HttpStatus.OK);
    }

    return result;
  }

  @Get()
  async list(
    @Query(new ZodValidationPipe(ConnectionsQuerySchema))
    query: ConnectionsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConnectionsListResponse> {
    return this.listConnections.execute({
      user,
      from: query.from,
      to: query.to,
      page: query.page,
      perPage: query.perPage,
    });
  }
}
