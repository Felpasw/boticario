import { describe, expect, it } from 'vitest';

import {
  ConnectionsQuerySchema,
  MacAddressSchema,
  RegisterConnectionRequestSchema,
} from './connection.js';

describe('MacAddressSchema', () => {
  it('accepts colon-separated hex', () => {
    expect(() => MacAddressSchema.parse('AA:BB:CC:DD:EE:FF')).not.toThrow();
  });

  it('accepts dash-separated hex', () => {
    expect(() => MacAddressSchema.parse('aa-bb-cc-dd-ee-ff')).not.toThrow();
  });

  it('rejects malformed input', () => {
    expect(() => MacAddressSchema.parse('AA:BB:CC:DD:EE')).toThrow();
    expect(() => MacAddressSchema.parse('ZZ:BB:CC:DD:EE:FF')).toThrow();
  });
});

describe('RegisterConnectionRequestSchema', () => {
  it('accepts a valid payload', () => {
    expect(() =>
      RegisterConnectionRequestSchema.parse({
        macAddress: 'AA:BB:CC:DD:EE:FF',
        connectedAt: '2026-10-08T14:03:00.000Z',
        disconnectedAt: '2026-10-08T14:41:00.000Z',
      }),
    ).not.toThrow();
  });

  it('accepts missing disconnectedAt', () => {
    expect(() =>
      RegisterConnectionRequestSchema.parse({
        macAddress: 'AA:BB:CC:DD:EE:FF',
        connectedAt: '2026-10-08T14:03:00.000Z',
      }),
    ).not.toThrow();
  });

  it('rejects disconnectedAt before connectedAt', () => {
    expect(() =>
      RegisterConnectionRequestSchema.parse({
        macAddress: 'AA:BB:CC:DD:EE:FF',
        connectedAt: '2026-10-08T14:03:00.000Z',
        disconnectedAt: '2026-10-08T13:00:00.000Z',
      }),
    ).toThrow();
  });
});

describe('ConnectionsQuerySchema', () => {
  it('fills defaults when page/perPage missing', () => {
    const parsed = ConnectionsQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.perPage).toBe(50);
  });

  it('coerces numeric strings', () => {
    const parsed = ConnectionsQuerySchema.parse({ page: '3', perPage: '25' });
    expect(parsed.page).toBe(3);
    expect(parsed.perPage).toBe(25);
  });

  it('rejects perPage > 200', () => {
    expect(() => ConnectionsQuerySchema.parse({ perPage: 500 })).toThrow();
  });
});
