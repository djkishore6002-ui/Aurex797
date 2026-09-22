import crypto from 'node:crypto';

/** Derive a stable 32-byte key from AUTH_SECRET for AES-256-GCM. */
function derivedKey(): Buffer {
  const secret = process.env.AUTH_SECRET || 'solai-dev-secret-change-me';
  return crypto.scryptSync(secret, 'solai-key-derivation-v1', 32);
}

/** AES-256-GCM encrypt a secret (e.g. a user's BYOAI OpenRouter key). */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

export function decryptSecret(packed: string): string | null {
  try {
    const [v, ivB64, tagB64, ctB64] = packed.split(':');
    if (v !== 'v1') return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const pt = Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]);
    return pt.toString('utf8');
  } catch {
    return null;
  }
}

/** One-way hash for opaque tokens (password resets, check-in tokens). */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}
