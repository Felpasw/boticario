import { describe, expect, it } from 'vitest';

import { generateSessionId } from './session-id-generator.js';

describe('generateSessionId', () => {
  it('returns a 64-character hex string', () => {
    const id = generateSessionId();
    expect(id).toHaveLength(64);
    expect(id).toMatch(/^[0-9a-f]+$/);
  });

  it('returns different ids on consecutive calls', () => {
    const first = generateSessionId();
    const second = generateSessionId();
    expect(first).not.toBe(second);
  });
});
