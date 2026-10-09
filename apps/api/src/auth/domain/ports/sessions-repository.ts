export const SESSIONS_REPOSITORY = Symbol('SESSIONS_REPOSITORY');

export interface CreateSessionInput {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface SessionSnapshot {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface SessionsRepository {
  create(input: CreateSessionInput): Promise<SessionSnapshot>;
  findActiveById(id: string, now: Date): Promise<SessionSnapshot | null>;
  deleteById(id: string): Promise<void>;
  renewExpiration(id: string, expiresAt: Date): Promise<void>;
}
