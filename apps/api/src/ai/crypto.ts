import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { config } from '../config';

/**
 * AI provider keys are kept encrypted in the database (AES-256-GCM), so a database dump or backup alone does not
 * reveal them. The encryption key comes from JWT_SECRET: changing that secret signs everyone out and also means the
 * AI key has to be entered again.
 */
const key = () => createHash('sha256').update(`profiterol-ai-key:${config.jwtSecret}`).digest();

/** "v1.<iv>.<tag>.<ciphertext>", each part base64url. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv, cipher.getAuthTag(), data].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.');
}

/** The plain secret, or '' when it cannot be read (no secret, or JWT_SECRET changed since it was saved). */
export function decryptSecret(stored: string | undefined): string {
  const [version, iv, tag, data] = (stored ?? '').split('.');
  if (version !== 'v1' || !iv || !tag || !data) return '';
  try {
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}
