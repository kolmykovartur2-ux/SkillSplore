import crypto from 'node:crypto';
import { env } from '../config/env.js';

// Envelope encryption for LinkedIn OAuth tokens (the one place this service
// needs *reversible* secrecy — everything else in the SkillSplore codebase
// only ever hashes one-way). AES-256-GCM; the 32-byte key is derived from
// TOKEN_ENCRYPTION_KEY via SHA-256 so any sufficiently long passphrase works
// without the operator having to produce exactly 32 raw bytes themselves.
//
// Format: base64(iv).base64(authTag).base64(ciphertext)
//
// Rotation: see docs/marketing-agent/TOKEN_ROTATION.md. Rotating the key
// requires re-encrypting stored tokens (or forcing reconnection) — there is
// no versioned-key scheme in this build, which is a documented limitation.

const KEY = crypto.createHash('sha256').update(env.TOKEN_ENCRYPTION_KEY).digest();

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join('.');
}

export function decrypt(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 3) throw new Error('Malformed encrypted payload');
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64!, 'base64');
  const authTag = Buffer.from(authTagB64!, 'base64');
  const ciphertext = Buffer.from(ciphertextB64!, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
