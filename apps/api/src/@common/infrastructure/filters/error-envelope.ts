import { HttpStatus } from '@nestjs/common';

export interface ErrorEnvelope {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
}

export interface DomainErrorMapping {
  status: number;
  code: string;
  message: string;
}

export const DOMAIN_ERROR_MAP: Record<string, DomainErrorMapping> = {
  InvalidCredentialsError: {
    status: HttpStatus.UNAUTHORIZED,
    code: 'INVALID_CREDENTIALS',
    message: 'email ou senha inválidos',
  },
  SessionExpiredError: {
    status: HttpStatus.UNAUTHORIZED,
    code: 'SESSION_EXPIRED',
    message: 'sessão expirada',
  },
  UserNotFoundError: {
    status: HttpStatus.NOT_FOUND,
    code: 'USER_NOT_FOUND',
    message: 'usuário não encontrado',
  },
  EmailAlreadyRegisteredError: {
    status: HttpStatus.CONFLICT,
    code: 'EMAIL_ALREADY_REGISTERED',
    message: 'email já cadastrado',
  },
};

export const HTTP_STATUS_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
};

export const HTTP_STATUS_MESSAGES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'requisição inválida',
  [HttpStatus.UNAUTHORIZED]: 'não autenticado',
  [HttpStatus.FORBIDDEN]: 'acesso negado',
  [HttpStatus.NOT_FOUND]: 'não encontrado',
  [HttpStatus.CONFLICT]: 'conflito',
};
