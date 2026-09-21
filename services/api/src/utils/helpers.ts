import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { config } from '../config';

// Simple XOR-based reversible obfuscation for BYOAI keys stored at rest (not high-security, but not plaintext either).
// Real production deployments should use KMS; we keep a transparent approach here documented in SECURITY.md.
const SECRET = config.jwtSecret.padEnd(32, '0').slice(0, 32);

export function encryptKey(plain: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(SECRET).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let enc = cipher.update(plain, 'utf8', 'hex');
  enc += cipher.final('hex');
  return iv.toString('hex') + ':' + enc;
}

export function decryptKey(blob: string): string {
  try {
    const [ivHex, enc] = blob.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.createHash('sha256').update(SECRET).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let dec = decipher.update(enc, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch {
    return '';
  }
}

export function newId(prefix = ''): string {
  return prefix + nanoid(16);
}

export function certNumber(): string {
  return 'AURX-' + nanoid(8).toUpperCase();
}

export function ok<T>(data: T) {
  return { success: true as const, data };
}
export function fail(code: string, message: string, status = 400) {
  return { status, body: { success: false as const, error: { code, message } } };
}
