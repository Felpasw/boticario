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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  ConnectionsQuerySchema,
  type ConnectionsListResponse,
  RegisterConnectionRequestSchema,
  type RegisterConnectionResponse,
} from 'shared';

import { ZodValidationPipe } from '../@common/infrastructure/pipes/zod-validation.pipe.js';
import { CurrentUser } from '../auth/infrastructure/decorators/current-user.decorator.js';
import { Public } from '../auth/infrastructure/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../auth/infrastructure/types/authenticated-request.js';
import { ListConnectionsUseCase } from './application/use-cases/list-connections.use-case.js';
import { RegisterConnectionUseCase } from './application/use-cases/register-connection.use-case.js';
import { ConnectionsQueryDto } from './dto/connections-query.dto.js';
import { RegisterConnectionDto } from './dto/register-connection.dto.js';
import { IngestKeyGuard } from './infrastructure/guards/ingest-key.guard.js';
import {
  CONNECTIONS_LIST_EXAMPLE,
  DISCONNECTED_BEFORE_CONNECTED_EXAMPLE,
  REGISTER_CREATED_EXAMPLE,
  REGISTER_IDEMPOTENT_EXAMPLE,
} from './swagger-examples.js';

@ApiTags('connections')
@Controller('connections')
export class ConnectionsController {
  constructor(
    private readonly registerConnection: RegisterConnectionUseCase,
    private readonly listConnections: ListConnectionsUseCase,
  ) {}

  @Public()
  @UseGuards(IngestKeyGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 1000, ttl: 60_000 } })
  @ApiSecurity('X-Ingest-Key')
  @ApiOperation({
    summary: 'Ingest a visitor connection event',
    description:
      'Authenticated by the X-Ingest-Key header (shared secret from env). The MAC address is HMAC-SHA256-hashed before storage and never kept raw. Idempotent — resending the same payload returns 200 with the original row.',
  })
  @ApiHeader({
    name: 'X-Ingest-Key',
    required: true,
    description: 'Shared ingest secret. Compared in constant time.',
    example: 'change-me-dev-ingest-key',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Optional override; if absent, derived from userId:macHash:connectedAt.',
    example: '7f3c-router-01-evt-9284',
  })
  @ApiBody({ type: RegisterConnectionDto })
  @ApiCreatedResponse({
    description: 'Connection registered for the first time.',
    schema: { example: REGISTER_CREATED_EXAMPLE },
  })
  @ApiOkResponse({
    description:
      'Idempotent replay — the connection with this key already exists; the original row is returned unchanged.',
    schema: { example: REGISTER_IDEMPOTENT_EXAMPLE },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid X-Ingest-Key.' })
  @ApiUnprocessableEntityResponse({
    description: 'disconnectedAt < connectedAt or malformed MAC.',
    schema: { example: DISCONNECTED_BEFORE_CONNECTED_EXAMPLE },
  })
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
  @ApiCookieAuth('boticario_session')
  @ApiOperation({
    summary: 'List connections for the current period',
    description:
      'Session-authenticated. Returns a paginated feed of raw connection events ordered by connectedAt desc.',
  })
  @ApiOkResponse({
    description: 'Paginated list for the requested window.',
    schema: { example: CONNECTIONS_LIST_EXAMPLE },
  })
  @ApiUnauthorizedResponse({ description: 'Session cookie missing, expired or revoked.' })
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
