import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, hashToken, randomToken } from '@/lib/crypto';

describe('encryptSecret / decryptSecret (AES-256-GCM)', () => {
  it('roundtrips ASCII secrets', () => {
    const secret = 'sk-or-v1-abcdef1234567890';
    const packed = encryptSecret(secret);
    expect(packed.startsWith('v1:')).toBe(true);
    expect(decryptSecret(packed)).toBe(secret);
  });

  it('roundtrips Unicode secrets (Tamil + symbols)', () => {
    const secret = 'வணக்கம் $ecret 123! @#key';
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    expect(encryptSecret('same-key')).not.toBe(encryptSecret('same-key'));
  });

  it('refuses to decrypt tampered ciphertext', () => {
    const packed = encryptSecret('top-secret');
    const parts = packed.split(':');
    // flip one char of the ciphertext
    const ct = parts[3]!;
    const flipped = (ct[0] === 'A' ? 'B' : 'A') + ct.slice(1);
    parts[3] = flipped;
    expect(decryptSecret(parts.join(':'))).toBeNull();
  });

  it('rejects unknown versions and malformed input', () => {
    const [v, ...rest] = encryptSecret('x').split(':');
    void v;
    expect(decryptSecret('v2:' + rest.join(':'))).toBeNull();
    expect(decryptSecret('garbage')).toBeNull();
    expect(decryptSecret('')).toBeNull();
  });
});

describe('hashToken', () => {
  it('is deterministic and produces sha256 hex', () => {
    const h1 = hashToken('check-in-token-123');
    const h2 = hashToken('check-in-token-123');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken('check-in-token-124')).not.toBe(h1);
  });
});

describe('randomToken', () => {
  it('generates unique, URL-safe tokens of the right length', () => {
    const t1 = randomToken(32);
    const t2 = randomToken(32);
    expect(t1).not.toBe(t2);
    expect(t1).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
