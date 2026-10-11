export interface IdempotencyKeyInput {
  userId: string;
  macHash: string;
  connectedAt: Date;
}

export function buildIdempotencyKey({ userId, macHash, connectedAt }: IdempotencyKeyInput): string {
  return `${userId}:${macHash}:${connectedAt.toISOString()}`;
}
