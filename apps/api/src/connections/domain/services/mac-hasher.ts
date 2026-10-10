import { createHmac } from 'node:crypto';

export function hashMac(mac: string, secret: string): string {
  return createHmac('sha256', secret).update(mac.toLowerCase()).digest('hex');
}
