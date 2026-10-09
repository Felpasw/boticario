import { randomBytes } from 'node:crypto';

const SESSION_ID_BYTES = 32;

export function generateSessionId(): string {
  return randomBytes(SESSION_ID_BYTES).toString('hex');
}
