import { describe, expect, it } from 'vitest';

import { Argon2PasswordHasher } from './argon2-password-hasher.js';

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();

  it('verifies a correct password after hashing', async () => {
    const hash = await hasher.hash('correct-horse');
    await expect(hasher.verify(hash, 'correct-horse')).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hasher.hash('correct-horse');
    await expect(hasher.verify(hash, 'battery-staple')).resolves.toBe(false);
  });

  it('produces different hashes for the same password (salt varies)', async () => {
    const first = await hasher.hash('same-input');
    const second = await hasher.hash('same-input');
    expect(first).not.toBe(second);
  });
});
