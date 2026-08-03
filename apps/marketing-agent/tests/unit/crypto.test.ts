import { describe, expect, it } from 'vitest';
import { encrypt, decrypt } from '../../src/lib/crypto.js';

describe('token encryption', () => {
  it('round-trips a plaintext token', () => {
    const plaintext = 'AQX-fake-linkedin-access-token-1234567890';
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toContain(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it('produces different ciphertext for the same plaintext each time (random IV)', () => {
    const a = encrypt('same-token');
    const b = encrypt('same-token');
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe('same-token');
    expect(decrypt(b)).toBe('same-token');
  });

  it('rejects a tampered ciphertext', () => {
    const ciphertext = encrypt('a-real-token');
    const parts = ciphertext.split('.');
    const tampered = [parts[0], parts[1], Buffer.from('tampered').toString('base64')].join('.');
    expect(() => decrypt(tampered)).toThrow();
  });
});
