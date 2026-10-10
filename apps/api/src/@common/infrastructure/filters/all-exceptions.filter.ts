import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import {
  DOMAIN_ERROR_MAP,
  type ErrorEnvelope,
  HTTP_STATUS_CODES,
  HTTP_STATUS_MESSAGES,
} from './error-envelope.js';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const envelope = this.buildEnvelope(exception, request);

    if (envelope.statusCode >= 500) {
      this.logger.error(`${envelope.error} on ${envelope.path}`, exception as Error);
    }

    response.status(envelope.statusCode).json(envelope);
  }

  private buildEnvelope(exception: unknown, request: Request): ErrorEnvelope {
    const base = { timestamp: new Date().toISOString(), path: request.url };

    if (exception instanceof Error) {
      const mapped = DOMAIN_ERROR_MAP[exception.name];
      if (mapped) {
        return { ...base, statusCode: mapped.status, error: mapped.code, message: mapped.message };
      }
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      return {
        ...base,
        statusCode: status,
        error: this.extractCustomCode(payload) ?? HTTP_STATUS_CODES[status] ?? 'HTTP_ERROR',
        message: this.extractMessage(payload) ?? HTTP_STATUS_MESSAGES[status] ?? 'erro inesperado',
        details: this.extractDetails(payload),
      };
    }

    return {
      ...base,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_ERROR',
      message: 'unexpected server error',
    };
  }

  private extractCustomCode(payload: unknown): string | undefined {
    if (payload && typeof payload === 'object') {
      const value = (payload as Record<string, unknown>).error;
      if (typeof value === 'string' && /^[A-Z0-9_]+$/.test(value)) return value;
    }
    return undefined;
  }

  private extractMessage(payload: unknown): string | undefined {
    if (typeof payload === 'string') return payload;
    if (payload && typeof payload === 'object') {
      const value = (payload as Record<string, unknown>).message;
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return value.join('; ');
    }
    return undefined;
  }

  private extractDetails(payload: unknown): unknown {
    if (payload && typeof payload === 'object') {
      return (payload as Record<string, unknown>).details;
    }
    return undefined;
  }
}
