import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth';

describe('password hashing (scrypt)', () => {
  it('verifies the correct password', () => {
    const stored = hashPassword('correct horse battery staple');
    expect(verifyPassword('correct horse battery staple', stored)).toBe(true);
  });

  it('rejects the wrong password', () => {
    const stored = hashPassword('correct horse battery staple');
    expect(verifyPassword('correct horse battery stapele', stored)).toBe(false);
    expect(verifyPassword('', stored)).toBe(false);
  });

  it('uses a random salt (different hash per call)', () => {
    const a = hashPassword('same-password');
    const b = hashPassword('same-password');
    expect(a).not.toBe(b);
    expect(a.startsWith('scrypt:')).toBe(true);
  });

  it('fails safely on malformed stored values', () => {
    expect(verifyPassword('x', 'not-a-hash')).toBe(false);
    expect(verifyPassword('x', '')).toBe(false);
    expect(verifyPassword('x', 'scrypt:abc')).toBe(false);
  });

  it('verifies Unicode passwords', () => {
    const stored = hashPassword('பாஸ்ওয়ার்ட் 123');
    expect(verifyPassword('பாஸ்ওয়ার்ட் 123', stored)).toBe(true);
  });
});
